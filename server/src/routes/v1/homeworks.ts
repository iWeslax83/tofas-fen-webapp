import { Router, Request, Response } from "express";
import { Homework } from "../../models/Homework";
import { User } from "../../models/User";
import { authenticateJWT, authorizeRoles } from "../../utils/jwt";
import { validateHomework } from "../../middleware/validation";

interface AuthUser {
  userId: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  sinif?: string;
  grade?: string;
  adSoyad?: string;
  childId?: string[];
}

const router = Router();

// Tüm ödevleri getir (filtreleme ile) — öğrenciler sadece kendi sınıfını görür, veliler çocuklarının sınıflarını
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { 
      subject, 
      classLevel, 
      classSection, 
      teacherId, 
      status,
      classLevels,
      page = 1,
      limit = 20
    } = req.query;
    const requestingUser = req.user as AuthUser;

    const filter: Record<string, any> = {};
    
    // Yardımcı: sinif/grade bilgisinden sadece sayısal sınıf seviyesini (9,10,11,12) çıkar
    const getNumericClassLevel = (raw?: string | number) => {
      if (!raw) return undefined;
      const digits = raw.toString().replace(/[^0-9]/g, '');
      return digits || undefined;
    };

    // Öğrenci ise sadece kendi sınıf seviyesinin ödevlerini göster
    if (requestingUser.role === 'student') {
      const rawLevel = requestingUser.sinif || requestingUser.grade;
      const numericLevel = getNumericClassLevel(rawLevel);
      if (numericLevel) {
        filter.classLevel = numericLevel;
      }
    }
    // Veli ise çocuklarının sınıf seviyelerini server-side lookup ile al (client'a güvenme)
    else if (requestingUser.role === 'parent') {
      const parent = await User.findOne({ id: requestingUser.userId }).select('childId').lean() as any;
      if (parent?.childId && parent.childId.length > 0) {
        const children = await User.find({ id: { $in: parent.childId } }).select('sinif').lean() as any[];
        const levels = children
          .map((child: any) => getNumericClassLevel(child.sinif))
          .filter((l): l is string => !!l);
        if (levels.length > 0) {
          filter.classLevel = { $in: [...new Set(levels)] };
        }
      }
    }
    // Öğretmen/Admin için query params'a izin ver
    else if (requestingUser.role === 'teacher' || requestingUser.role === 'admin') {
      if (classLevel) filter.classLevel = classLevel;
      if (classSection) filter.classSection = classSection;
      if (teacherId) filter.teacherId = teacherId;
    }
    
    if (subject) filter.subject = subject;
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
    console.error('Ödevler getirilirken hata:', error);
    res.status(500).json({ error: 'Ödevler getirilirken bir hata oluştu' });
  }
});

// Belirli bir ödevi getir (öğrenciler sadece kendi sınıfını, veliler çocuklarının sınıflarını görebilir)
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    const requestingUser = req.user as AuthUser;

    // Access control based on role
    if (requestingUser.role === 'student') {
      // Öğrenci sadece kendi sınıfının ödevlerini görebilir
      if (homework.classLevel !== (requestingUser.sinif || requestingUser.grade)) {
        return res.status(403).json({ error: 'Bu ödeve erişim izniniz yok' });
      }
    } else if (requestingUser.role === 'parent') {
      // Veli sadece çocuklarının sınıflarının ödevlerini görebilir
      const parent = await User.findOne({ id: requestingUser.userId }).select('childId').lean() as any;
      
      if (!parent || !parent.childId || parent.childId.length === 0) {
        return res.status(403).json({ error: 'Bu ödeve erişim izniniz yok' });
      }
      
      const children = await User.find({ id: { $in: parent.childId } }).select('sinif').lean() as any[];
      const childrenSiniflar = children.map((child: any) => child.sinif).filter((s: string | undefined): s is string => !!s);
      
      if (!childrenSiniflar.includes(homework.classLevel)) {
        return res.status(403).json({ error: 'Bu ödeve erişim izniniz yok' });
      }
    }
    // Öğretmen ve yönetici tüm ödevleri görebilir

    res.json(homework);
  } catch (error) {
    console.error('Ödev getirilirken hata:', error);
    res.status(500).json({ error: 'Ödev getirilirken bir hata oluştu' });
  }
});

// Yeni ödev ekle (sadece öğretmen ve admin)
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req: Request, res: Response) => {
  try {
    const { title, description, subject, classLevel, classSection, dueDate, attachments } = req.body;
    const user = req.user as AuthUser;
    
    const newHomework = new Homework({
      id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      subject,
      teacherId: user.userId,
      teacherName: user.adSoyad || 'Bilinmeyen Öğretmen',
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
    console.error('Ödev oluşturulurken hata:', error);
    res.status(500).json({ error: 'Ödev oluşturulurken bir hata oluştu' });
  }
});

// Yeni ödev ekle - /create endpoint (sadece öğretmen ve admin)
router.post("/create", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req: Request, res: Response) => {
  try {
    const { title, description, subject, classLevel, classSection, dueDate, attachments } = req.body;
    const user = req.user as AuthUser;
    
    const newHomework = new Homework({
      id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      subject,
      teacherId: user.userId,
      teacherName: user.adSoyad || 'Bilinmeyen Öğretmen',
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
    console.error('Ödev oluşturulurken hata:', error);
    res.status(500).json({ error: 'Ödev oluşturulurken bir hata oluştu' });
  }
});

// Ödev güncelle (sadece oluşturan öğretmen veya admin)
router.put("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateHomework, async (req: Request, res: Response) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    const user = req.user as AuthUser;
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin güncelleyebilir
    if (homework.teacherId !== user.userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi güncelleme yetkiniz yok' });
    }

    const updatedHomework = await Homework.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json(updatedHomework);
  } catch (error) {
    console.error('Ödev güncellenirken hata:', error);
    res.status(500).json({ error: 'Ödev güncellenirken bir hata oluştu' });
  }
});

// Ödev sil (sadece oluşturan öğretmen veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const homework = await Homework.findOne({ id: req.params.id });
    const user = req.user as AuthUser;
    
    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin silebilir
    if (homework.teacherId !== user.userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi silme yetkiniz yok' });
    }

    await Homework.findOneAndDelete({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error('Ödev silinirken hata:', error);
    res.status(500).json({ error: 'Ödev silinirken bir hata oluştu' });
  }
});

// Ödev durumunu güncelle (sadece admin)
router.patch("/:id/status", authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
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
    console.error('Ödev durumu güncellenirken hata:', error);
    res.status(500).json({ error: 'Ödev durumu güncellenirken bir hata oluştu' });
  }
});

// Öğrenciye göre ödevleri getir (class-level güvenliği ile)
router.get("/student/:studentId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const requestingUser = req.user as AuthUser;

    // Yardımcı: sinif/grade bilgisinden sadece sayısal sınıf seviyesini (9,10,11,12) çıkar
    const getNumericClassLevel = (raw?: string | number) => {
      if (!raw) return undefined;
      const digits = raw.toString().replace(/[^0-9]/g, '');
      return digits || undefined;
    };

    // Öğrenciler sadece kendi ödevlerini görebilir; öğretmen ve admin tüm öğrencileri sorgulanabilir
    if (requestingUser.role === 'student' && requestingUser.userId !== studentId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const filter: Record<string, any> = {};
    
    // Eğer istek yapan öğrenci ise sadece kendi sınıf seviyesinin ödevlerini göster
    if (requestingUser.role === 'student' && (requestingUser.sinif || requestingUser.grade)) {
      const rawLevel = requestingUser.sinif || requestingUser.grade;
      const numericLevel = getNumericClassLevel(rawLevel);
      if (numericLevel) {
        filter.classLevel = numericLevel;
      }
    } else {
      // Öğretmen/admin için query param'lara izin ver
      const { classLevel, classSection } = req.query;
      if (classLevel) filter.classLevel = classLevel;
      if (classSection) filter.classSection = classSection;
    }

    const homeworks = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ homeworks });
  } catch (error) {
    console.error('Öğrenci ödevleri getirilirken hata:', error);
    res.status(500).json({ error: 'Öğrenci ödevleri getirilirken bir hata oluştu' });
  }
});

// Öğretmene göre ödevleri getir
router.get("/teacher/:teacherId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { status, subject, classLevel } = req.query;

    const filter: Record<string, any> = { teacherId };
    
    if (status) filter.status = status;
    if (subject) filter.subject = subject;
    if (classLevel) filter.classLevel = classLevel;

    const homeworks = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ homeworks });
  } catch (error) {
    console.error('Öğretmen ödevleri getirilirken hata:', error);
    res.status(500).json({ error: 'Öğretmen ödevleri getirilirken bir hata oluştu' });
  }
});

export { router as homeworkRoutes };
