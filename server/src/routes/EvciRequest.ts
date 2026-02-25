import { Router, Request, Response } from "express";
import { EvciRequest, IEvciRequest } from "../models/EvciRequest";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { getParentChildIds, verifyParentChildAccess } from "../middleware/parentChildAccess";
const router = Router();

// Tüm evci taleplerini getir (admin)
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  const all = await EvciRequest.find();
  res.json(all);
});

// Belirli bir öğrencinin evci talepleri - ownership check
router.get("/student/:studentId", authenticateJWT, verifyParentChildAccess('params.studentId'), async (req, res) => {
  const list = await EvciRequest.find({ studentId: req.params.studentId });
  res.json(list);
});

// Yeni evci talebi oluştur
router.post("/", authenticateJWT, authorizeRoles(['student', 'parent']), async (req: Request, res: Response) => {
  try {
    const { studentId, willGo, startDate, endDate, destination } = req.body;
    
    // Zorunlu alanları kontrol et
    if (!studentId) {
      return res.status(400).json({ error: 'Öğrenci ID zorunludur' });
    }

    // Ownership validation: students can only create for themselves, parents only for linked children
    const role = req.user?.role;
    const userId = req.user?.userId;
    if (role === 'student' && studentId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi adınıza evci talebi oluşturabilirsiniz' });
    }
    if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (!childIds.includes(studentId)) {
        return res.status(403).json({ error: 'Bu öğrenci için evci talebi oluşturma yetkiniz yok' });
      }
    }

    if (willGo === undefined || willGo === null) {
      return res.status(400).json({ error: 'willGo alanı zorunludur' });
    }
    
    // willGo true ise tarih ve yer gerekli
    if (willGo === true) {
      if (!startDate) {
        return res.status(400).json({ error: 'Başlangıç tarihi zorunludur' });
      }
      if (!endDate) {
        return res.status(400).json({ error: 'Bitiş tarihi zorunludur' });
      }
      if (!destination) {
        return res.status(400).json({ error: 'Gidilecek yer zorunludur' });
      }
      
      // Tarihleri doğrula
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Geçersiz başlangıç tarihi' });
      }
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Geçersiz bitiş tarihi' });
      }
      if (end <= start) {
        return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
      }
    }
    
    // Öğrenci adını al
    const { User } = await import('../models/User');
    const user = await User.findOne({ id: studentId });
    const studentName = user ? user.adSoyad : 'Bilinmeyen Öğrenci';
    
    const newReq = new EvciRequest({ 
      studentId, 
      studentName,
      willGo: willGo === true || willGo === 'true', 
      startDate: startDate || null, 
      endDate: endDate || null, 
      destination: destination || null 
    });
    await newReq.save();
    res.status(201).json(newReq);
  } catch (error) {
    console.error('Error creating evci request:', error);
    res.status(500).json({ error: 'Evci talebi oluşturulurken hata oluştu' });
  }
});

// Evci talebini sil (sadece oluşturan kişi veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), async (req, res) => {
  try {
    const deleted = await EvciRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting evci request:', error);
    res.status(500).json({ error: 'Evci talebi silinirken hata oluştu' });
  }
});

// Evci talebini güncelle (sadece oluşturan kişi veya admin)
router.patch("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), async (req, res) => {
  try {
    const updated = await EvciRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating evci request:', error);
    res.status(500).json({ error: 'Evci talebi güncellenirken hata oluştu' });
  }
});

export default router;
