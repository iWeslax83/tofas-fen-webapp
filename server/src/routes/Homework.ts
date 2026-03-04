import { Router } from "express";
import { Homework, IHomework } from "../models/Homework";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateHomework } from "../middleware/validation";
import { User } from "../models";
import { getParentChildIds } from "../middleware/parentChildAccess";
import logger from "../utils/logger";

const router = Router();

// Tüm ödevleri getir (filtreleme ile) - rol bazlı erişim
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
    const role = req.user?.role;
    const userId = req.user?.userId;

    // Rol bazlı filtreleme
    if (role === 'student') {
      // Öğrenci sadece kendi sınıfının ödevlerini görebilir
      const student = await User.findOne({ id: userId }).select('sinif sube').lean() as any;
      if (student?.sinif) {
        filter.classLevel = student.sinif;
        if (student.sube) filter.classSection = student.sube;
      }
    } else if (role === 'parent') {
      // Veli sadece çocuklarının sınıflarının ödevlerini görebilir
      const childIds = await getParentChildIds(userId!);
      if (childIds.length === 0) {
        return res.json({ homeworks: [], pagination: { page: 1, limit: Number(limit), total: 0, pages: 0 } });
      }
      const children = await User.find({ id: { $in: childIds } }).select('sinif sube').lean() as any[];
      const levels = [...new Set(children.map((c: any) => c.sinif).filter(Boolean))];
      const sections = [...new Set(children.map((c: any) => c.sube).filter(Boolean))];
      if (levels.length > 0) filter.classLevel = { $in: levels };
      if (sections.length > 0) filter.classSection = { $in: sections };
    } else if (role === 'teacher') {
      // Öğretmen kendi ödevlerini veya query param ile filtre uygulayabilir
      if (!classLevel && !classSection && !teacherId) {
        filter.teacherId = userId;
      }
    }
    // Admin: tüm filtreleri query param ile uygulayabilir

    if (subject) filter.subject = subject;
    if (classLevel && !filter.classLevel) filter.classLevel = classLevel;
    if (classSection && !filter.classSection) filter.classSection = classSection;
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    
    const homeworks = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Homework.countDocuments(filter);

    // Tarihleri ISO string formatına dönüştür
    const formattedHomeworks = homeworks.map(hw => ({
      ...hw,
      assignedDate: hw.assignedDate ? new Date(hw.assignedDate).toISOString() : undefined,
      dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString() : undefined,
      createdAt: hw.createdAt ? new Date(hw.createdAt).toISOString() : undefined,
      updatedAt: hw.updatedAt ? new Date(hw.updatedAt).toISOString() : undefined
    }));

    res.json({
      homeworks: formattedHomeworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Homework fetch error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödevler getirilirken hata oluştu' });
  }
});

// Belirli bir ödevi getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    let homework: any = await Homework.findOne({ id: req.params.id }).lean();
    if (!homework) {
      homework = await Homework.findById(req.params.id).lean();
    }

    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Tarihleri ISO string formatına dönüştür
    const formattedHomework = {
      ...homework,
      assignedDate: homework.assignedDate ? new Date(homework.assignedDate).toISOString() : undefined,
      dueDate: homework.dueDate ? new Date(homework.dueDate).toISOString() : undefined,
      createdAt: homework.createdAt ? new Date(homework.createdAt).toISOString() : undefined,
      updatedAt: homework.updatedAt ? new Date(homework.updatedAt).toISOString() : undefined
    };

    res.json(formattedHomework);
  } catch (error) {
    logger.error('Homework fetch error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödev getirilirken hata oluştu' });
  }
});

// Yeni ödev ekle (sadece öğretmen ve admin)
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req, res) => {
  try {
    const { title, description, subject, classLevel, classSection, assignedDate, dueDate, attachments } = req.body;
    
    const newHomework = new Homework({
      id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      subject,
      teacherId: req.user.userId,
      teacherName: (req.user as any).adSoyad || 'Bilinmeyen Öğretmen',
      classLevel,
      classSection,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
      dueDate: new Date(dueDate),
      attachments: attachments || [],
      status: 'active',
      isPublished: true
    });

    const savedHomework = await newHomework.save();
    
    // Tarihleri ISO string formatına dönüştür
    const formattedHomework = {
      ...savedHomework.toObject(),
      assignedDate: savedHomework.assignedDate ? new Date(savedHomework.assignedDate).toISOString() : undefined,
      dueDate: savedHomework.dueDate ? new Date(savedHomework.dueDate).toISOString() : undefined,
      createdAt: savedHomework.createdAt ? new Date(savedHomework.createdAt).toISOString() : undefined,
      updatedAt: savedHomework.updatedAt ? new Date(savedHomework.updatedAt).toISOString() : undefined
    };
    
    res.status(201).json(formattedHomework);
  } catch (error) {
    logger.error('Homework creation error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödev oluşturulurken hata oluştu' });
  }
});

// Yeni ödev ekle - /create endpoint (sadece öğretmen ve admin)
router.post("/create", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req, res) => {
  try {
    const { title, description, subject, classLevel, classSection, assignedDate, dueDate, attachments } = req.body;
    
    const newHomework = new Homework({
      id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      subject,
      teacherId: req.user.userId,
      teacherName: (req.user as any).adSoyad || 'Bilinmeyen Öğretmen',
      classLevel,
      classSection,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
      dueDate: new Date(dueDate),
      attachments: attachments || [],
      status: 'active',
      isPublished: true
    });

    const savedHomework = await newHomework.save();
    
    // Tarihleri ISO string formatına dönüştür
    const formattedHomework = {
      ...savedHomework.toObject(),
      assignedDate: savedHomework.assignedDate ? new Date(savedHomework.assignedDate).toISOString() : undefined,
      dueDate: savedHomework.dueDate ? new Date(savedHomework.dueDate).toISOString() : undefined,
      createdAt: savedHomework.createdAt ? new Date(savedHomework.createdAt).toISOString() : undefined,
      updatedAt: savedHomework.updatedAt ? new Date(savedHomework.updatedAt).toISOString() : undefined
    };
    
    res.status(201).json(formattedHomework);
  } catch (error) {
    logger.error('Homework creation error', { error: error instanceof Error ? error.message : error });
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

    // Field whitelisting — sadece izin verilen alanlar güncellenir
    const { title, description, subject, assignedDate, dueDate, attachments, classLevel, classSection } = req.body;
    const updateFields: any = { updatedAt: new Date() };
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (subject !== undefined) updateFields.subject = subject;
    if (assignedDate !== undefined) updateFields.assignedDate = new Date(assignedDate);
    if (dueDate !== undefined) updateFields.dueDate = new Date(dueDate);
    if (attachments !== undefined) updateFields.attachments = attachments;
    if (classLevel !== undefined) updateFields.classLevel = classLevel;
    if (classSection !== undefined) updateFields.classSection = classSection;

    const updatedHomework = await Homework.findOneAndUpdate(
      { id: req.params.id },
      updateFields,
      { new: true }
    );

    if (!updatedHomework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Tarihleri ISO string formatına dönüştür
    const formattedHomework = {
      ...updatedHomework.toObject(),
      assignedDate: updatedHomework.assignedDate ? new Date(updatedHomework.assignedDate).toISOString() : undefined,
      dueDate: updatedHomework.dueDate ? new Date(updatedHomework.dueDate).toISOString() : undefined,
      createdAt: updatedHomework.createdAt ? new Date(updatedHomework.createdAt).toISOString() : undefined,
      updatedAt: updatedHomework.updatedAt ? new Date(updatedHomework.updatedAt).toISOString() : undefined
    };

    res.json(formattedHomework);
  } catch (error) {
    logger.error('Homework update error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödev güncellenirken hata oluştu' });
  }
});

// Ödev sil (sadece oluşturan öğretmen veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hem id hem _id ile arama yap (MongoDB _id veya custom id field)
    let homework = await Homework.findOne({ id: id });
    if (!homework) {
      homework = await Homework.findById(id);
    }
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin silebilir
    if (homework.teacherId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi silme yetkiniz yok' });
    }

    // Hem id hem _id ile silme dene
    let deleted = await Homework.findOneAndDelete({ id: id });
    if (!deleted) {
      deleted = await Homework.findByIdAndDelete(id);
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Ödev silinemedi' });
    }

    // Align with tests and REST best practices: 204 No Content on successful delete
    res.status(204).send();
  } catch (error) {
    logger.error('Homework deletion error', { error: error instanceof Error ? error.message : error });
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
    logger.error('Homework status update error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödev durumu güncellenirken hata oluştu' });
  }
});

export default router; 