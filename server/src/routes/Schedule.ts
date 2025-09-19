import { Router } from "express";
import { Schedule, ISchedule } from "../models/Schedule";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateRequest } from "../middleware/validation";
import { body } from "express-validator";

const router = Router();

// Validation rules for schedule
const validateSchedule = [
  body('classLevel')
    .trim()
    .isIn(['9', '10', '11', '12'])
    .withMessage('Geçersiz sınıf seviyesi'),
  
  body('classSection')
    .trim()
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('Geçersiz şube'),
  
  body('academicYear')
    .trim()
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Geçersiz akademik yıl formatı (örn: 2024-2025)'),
  
  body('semester')
    .trim()
    .isIn(['1. Dönem', '2. Dönem'])
    .withMessage('Geçersiz dönem'),
  
  body('schedule')
    .isArray({ min: 1 })
    .withMessage('En az bir gün olmalıdır'),
  
  body('schedule.*.day')
    .isIn(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'])
    .withMessage('Geçersiz gün'),
  
  body('schedule.*.periods')
    .isArray({ min: 1, max: 8 })
    .withMessage('Günde 1-8 ders olmalıdır'),
  
  body('schedule.*.periods.*.period')
    .isInt({ min: 1, max: 8 })
    .withMessage('Ders saati 1-8 arasında olmalıdır'),
  
  body('schedule.*.periods.*.subject')
    .isIn([
      'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce', 
      'Türkçe', 'Tarih', 'Coğrafya', 'Din Kültürü', 'Beden Eğitimi',
      'Müzik', 'Görsel Sanatlar', 'Teknoloji ve Tasarım', 'Bilişim Teknolojileri'
    ])
    .withMessage('Geçersiz ders adı'),
  
  body('schedule.*.periods.*.teacherId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Öğretmen ID gerekli'),
  
  body('schedule.*.periods.*.teacherName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Öğretmen adı 2-100 karakter arasında olmalıdır'),
  
  body('schedule.*.periods.*.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Geçersiz başlangıç saati (HH:MM)'),
  
  body('schedule.*.periods.*.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Geçersiz bitiş saati (HH:MM)'),
  
  validateRequest
];

// Tüm ders programlarını getir (filtreleme ile)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { 
      classLevel, 
      classSection, 
      academicYear, 
      semester,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    const filter: any = {};
    
    if (classLevel) filter.classLevel = classLevel;
    if (classSection) filter.classSection = classSection;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    
    const schedules = await Schedule.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Schedule.countDocuments(filter);

    res.json({
      schedules,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ error: 'Ders programları getirilirken hata oluştu' });
  }
});

// Belirli bir ders programını getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ id: req.params.id });
    
    if (!schedule) {
      return res.status(404).json({ error: 'Ders programı bulunamadı' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ error: 'Ders programı getirilirken hata oluştu' });
  }
});

// Sınıf ve şubeye göre ders programını getir
router.get("/class/:classLevel/:classSection", authenticateJWT, async (req, res) => {
  try {
    const { classLevel, classSection } = req.params;
    const { academicYear, semester } = req.query;

    const filter: any = {
      classLevel,
      classSection,
      isActive: true
    };

    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;

    const schedule = await Schedule.findOne(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Bu sınıf için aktif ders programı bulunamadı' 
      });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Class schedule fetch error:', error);
    res.status(500).json({ error: 'Sınıf ders programı getirilirken hata oluştu' });
  }
});

// Yeni ders programı oluştur (sadece admin)
router.post("/", authenticateJWT, authorizeRoles(['admin']), validateSchedule, async (req, res) => {
  try {
    const { classLevel, classSection, academicYear, semester, schedule } = req.body;
    
    // Aynı sınıf için aktif program var mı kontrol et
    const existingActive = await Schedule.findOne({
      classLevel,
      classSection,
      academicYear,
      semester,
      isActive: true
    });

    if (existingActive) {
      return res.status(400).json({ 
        error: 'Bu sınıf için zaten aktif bir ders programı bulunmaktadır' 
      });
    }

    const newSchedule = new Schedule({
      id: `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classLevel,
      classSection,
      academicYear,
      semester,
      schedule,
      isActive: true,
      createdBy: req.user.userId
    });

    const savedSchedule = await newSchedule.save();
    res.status(201).json(savedSchedule);
  } catch (error) {
    console.error('Schedule creation error:', error);
    res.status(500).json({ error: 'Ders programı oluşturulurken hata oluştu' });
  }
});

// Ders programı güncelle (sadece admin)
router.put("/:id", authenticateJWT, authorizeRoles(['admin']), validateSchedule, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ id: req.params.id });
    
    if (!schedule) {
      return res.status(404).json({ error: 'Ders programı bulunamadı' });
    }

    const updatedSchedule = await Schedule.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Schedule update error:', error);
    res.status(500).json({ error: 'Ders programı güncellenirken hata oluştu' });
  }
});

// Ders programı durumunu güncelle (sadece admin)
router.patch("/:id/status", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Geçersiz durum değeri' });
    }

    const updatedSchedule = await Schedule.findOneAndUpdate(
      { id: req.params.id },
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ error: 'Ders programı bulunamadı' });
    }

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Schedule status update error:', error);
    res.status(500).json({ error: 'Ders programı durumu güncellenirken hata oluştu' });
  }
});

// Ders programı sil (sadece admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ id: req.params.id });
    
    if (!schedule) {
      return res.status(404).json({ error: 'Ders programı bulunamadı' });
    }

    await Schedule.findOneAndDelete({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error('Schedule deletion error:', error);
    res.status(500).json({ error: 'Ders programı silinirken hata oluştu' });
  }
});

export default router;
