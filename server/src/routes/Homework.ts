import { Router } from "express";
import { Homework, IHomework } from "../models/Homework";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateHomework } from "../middleware/validation";

const router = Router();

// Tüm ödevleri getir (filtreleme ile)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { 
      subject, 
      classLevel, 
      classSection, 
      teacherId, 
      status,
      page = 1,
      limit = 20
    } = req.query;

    const filter: any = {};
    
    if (subject) filter.subject = subject;
    if (classLevel) filter.classLevel = classLevel;
    if (classSection) filter.classSection = classSection;
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    
    const homeworks = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Homework.countDocuments(filter);

    res.json({
      homeworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Homework fetch error:', error);
    res.status(500).json({ error: 'Ödevler getirilirken hata oluştu' });
  }
});

// Belirli bir ödevi getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    res.json(homework);
  } catch (error) {
    console.error('Homework fetch error:', error);
    res.status(500).json({ error: 'Ödev getirilirken hata oluştu' });
  }
});

// Yeni ödev ekle (sadece öğretmen ve admin)
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req, res) => {
  try {
    const { title, description, subject, classLevel, classSection, dueDate, attachments } = req.body;
    
    const newHomework = new Homework({
      id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      subject,
      teacherId: req.user.userId,
      teacherName: req.user.adSoyad || 'Bilinmeyen Öğretmen',
      classLevel,
      classSection,
      dueDate: new Date(dueDate),
      attachments: attachments || [],
      status: 'active',
      isPublished: true
    });

    const savedHomework = await newHomework.save();
    res.status(201).json(savedHomework);
  } catch (error) {
    console.error('Homework creation error:', error);
    res.status(500).json({ error: 'Ödev oluşturulurken hata oluştu' });
  }
});

// Ödev güncelle (sadece oluşturan öğretmen veya admin)
router.put("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req, res) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin güncelleyebilir
    if (homework.teacherId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi güncelleme yetkiniz yok' });
    }

    const updatedHomework = await Homework.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json(updatedHomework);
  } catch (error) {
    console.error('Homework update error:', error);
    res.status(500).json({ error: 'Ödev güncellenirken hata oluştu' });
  }
});

// Ödev sil (sadece oluşturan öğretmen veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin silebilir
    if (homework.teacherId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi silme yetkiniz yok' });
    }

    await Homework.findOneAndDelete({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error('Homework deletion error:', error);
    res.status(500).json({ error: 'Ödev silinirken hata oluştu' });
  }
});

// Ödev durumunu güncelle (sadece admin)
router.patch("/:id/status", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'completed', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const updatedHomework = await Homework.findOneAndUpdate(
      { id: req.params.id },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedHomework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    res.json(updatedHomework);
  } catch (error) {
    console.error('Homework status update error:', error);
    res.status(500).json({ error: 'Ödev durumu güncellenirken hata oluştu' });
  }
});

export default router; 