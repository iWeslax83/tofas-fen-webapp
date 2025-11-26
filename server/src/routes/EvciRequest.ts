import { Router } from "express";
import { EvciRequest, IEvciRequest } from "../models/EvciRequest";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateEvciRequest } from "../middleware/validation";
const router = Router();

// Tüm evci taleplerini getir (admin)
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  const all = await EvciRequest.find();
  res.json(all);
});

// Belirli bir öğrencinin evci talepleri
router.get("/student/:studentId", authenticateJWT, async (req, res) => {
  const list = await EvciRequest.find({ studentId: req.params.studentId });
  res.json(list);
});

// Yeni evci talebi oluştur
router.post("/", authenticateJWT, authorizeRoles(['student', 'parent']), async (req, res) => {
  try {
    const { studentId, willGo, startDate, endDate, destination } = req.body;
    
    // Öğrenci adını al
    const { User } = await import('../models/User');
    const user = await User.findOne({ id: studentId });
    const studentName = user ? user.adSoyad : 'Bilinmeyen Öğrenci';
    
    const newReq = new EvciRequest({ 
      studentId, 
      studentName,
      willGo, 
      startDate, 
      endDate, 
      destination 
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
