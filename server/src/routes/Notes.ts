import { Router } from "express";
import Note, { INote } from "../models/Note";
import { ExcelImportService } from "../services/excelImportService";
import { Request, Response } from "express";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { User } from "../models";
import { getParentChildIds, verifyParentChildAccess } from "../middleware/parentChildAccess";
import logger from "../utils/logger";

const router = Router();

// Tüm notları getir (filtreleme ile) - requires authentication
// Students see only their own notes, parents see only linked children's notes
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      lesson,
      semester,
      academicYear,
      source,
      gradeLevel,
      classSection
    } = req.query;

    const filter: any = { isActive: true };
    const role = req.user?.role;
    const userId = req.user?.userId;

    // Role-based filtering - enforce server-side data access control
    if (role === 'student') {
      filter.studentId = userId;
    } else if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (childIds.length === 0) {
        res.json([]);
        return;
      }
      filter.studentId = { $in: childIds };
    } else {
      // Teacher/Admin - allow query param filtering
      if (studentId) filter.studentId = studentId;
    }

    if (lesson) filter.lesson = lesson;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (source) filter.source = source;
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (classSection) filter.classSection = classSection;

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find(filter).sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
      Note.countDocuments(filter),
    ]);

    res.json({ success: true, data: notes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Notlari getirme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Notlar getirilemedi' });
  }
});

// Belirli bir öğrencinin notlarını getir - requires authentication + ownership check
router.get("/student/:studentId", authenticateJWT, verifyParentChildAccess('params.studentId'), async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { semester, academicYear } = req.query;

    const filter: any = { 
      studentId, 
      isActive: true 
    };

    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const notes = await Note.find(filter)
      .sort({ lesson: 1, lastUpdated: -1 })
      .lean();

    res.json(notes);
  } catch (error) {
    logger.error('Ogrenci notlari getirme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Öğrenci notları getirilemedi' });
  }
});

// Yeni not ekle - requires teacher/admin authentication
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const noteData = req.body;
    noteData.source = 'manual';
    
    const note = new Note(noteData);
    await note.save();
    
    res.status(201).json(note);
  } catch (error) {
    logger.error('Not ekleme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(400).json({ success: false, error: 'Not eklenemedi', details: (error as Error).message });
  }
});

// Not güncelle - requires teacher/admin authentication + ownership check
router.put("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const authUser = req.user;

    // Önce notu getir ve sahiplik kontrolü yap
    const existingNote = await Note.findById(id);
    if (!existingNote) {
      res.status(404).json({ success: false, error: 'Not bulunamadı' });
      return;
    }

    // Sadece notu oluşturan öğretmen veya admin güncelleyebilir
    if (authUser?.role !== 'admin' && (existingNote as any).createdBy && (existingNote as any).createdBy !== authUser?.userId) {
      res.status(403).json({ success: false, error: 'Bu notu güncelleme yetkiniz yok' });
      return;
    }

    const note = await Note.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(note);
  } catch (error) {
    logger.error('Not guncelleme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(400).json({ success: false, error: 'Not güncellenemedi', details: (error as Error).message });
  }
});

// Not sil (soft delete) - requires teacher/admin authentication
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    );
    
    if (!note) {
      res.status(404).json({ success: false, error: 'Not bulunamadı' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Not silme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(400).json({ success: false, error: 'Not silinemedi', details: (error as Error).message });
  }
});

// Excel dosyasından notları içe aktar - requires teacher/admin authentication
router.post("/import-excel", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
      return;
    }

    const { semester, academicYear, source } = req.body;
    
    if (!semester || !academicYear) {
      res.status(400).json({ success: false, error: 'Dönem ve akademik yıl bilgisi gerekli' });
      return;
    }

    // Excel dosyasını parse et
    const notes = ExcelImportService.parseFileByExtension(req.file.buffer, req.file.originalname);
    
    // Not verilerini doğrula
    const validation = ExcelImportService.validateNoteData(notes);
    
    if (validation.errors.length > 0) {
      res.status(400).json({ 
        error: 'Dosyada hatalar var', 
        errors: validation.errors 
      });
      return;
    }
    
    // Öğrenci ID'lerini doğrula
    const studentIds = validation.valid.map(note => note.studentId);
    const studentValidation = await ExcelImportService.validateStudentIds(studentIds);
    
    if (studentValidation.invalid.length > 0) {
      res.status(400).json({ 
        error: 'Geçersiz öğrenci ID\'leri var', 
        invalidIds: studentValidation.invalid 
      });
      return;
    }
    
    // Notları veritabanına toplu kaydet (insertMany ile performans optimizasyonu)
    const noteDocs = validation.valid.map(noteData => ({
      studentId: noteData.studentId,
      lesson: noteData.subject,
      grade: noteData.note,
      date: new Date(noteData.date),
      description: noteData.description,
      semester,
      academicYear,
      source: source || 'excel',
      isActive: true
    }));
    const savedNotes = await Note.insertMany(noteDocs, { ordered: false });

    res.json({
      success: true,
      imported: savedNotes.length,
      errors: validation.errors,
      message: `${savedNotes.length} not başarıyla içe aktarıldı`
    });
  } catch (error) {
    logger.error('Excel import hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Excel dosyası işlenemedi', details: (error as Error).message });
  }
});

// Not istatistikleri - requires authentication
router.get("/stats", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { semester, academicYear, gradeLevel, classSection } = req.query;
    const role = req.user?.role;
    const userId = req.user?.userId;

    const filter: any = { isActive: true };

    // Role-based filtering
    if (role === 'student') {
      filter.studentId = userId;
    } else if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (childIds.length === 0) {
        res.json([]);
        return;
      }
      filter.studentId = { $in: childIds };
    }

    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (classSection) filter.classSection = classSection;

    const stats = await Note.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            lesson: "$lesson",
            semester: "$semester",
            academicYear: "$academicYear"
          },
          count: { $sum: 1 },
          avgGrade: { $avg: "$grade" },
          minGrade: { $min: "$grade" },
          maxGrade: { $max: "$grade" }
        }
      },
      { $sort: { "_id.lesson": 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    logger.error('Istatistik hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'İstatistikler hesaplanamadı' });
  }
});

// Toplu not güncelleme - requires teacher/admin authentication + ownership check
router.put("/bulk-update", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const authUser = req.user;

    if (!Array.isArray(notes)) {
      res.status(400).json({ success: false, error: 'Notlar dizisi gerekli' });
      return;
    }

    const updatePromises = notes.map(async (noteUpdate: any) => {
      const { id, ...updateData } = noteUpdate;

      // Sahiplik kontrolü: admin değilse, notu oluşturan kişi mi kontrol et
      if (authUser?.role !== 'admin') {
        const existingNote = await Note.findById(id);
        if (existingNote && (existingNote as any).createdBy && (existingNote as any).createdBy !== authUser?.userId) {
          return null; // Yetkisiz notları atla
        }
      }

      return Note.findByIdAndUpdate(id, updateData, { new: true });
    });

    const results = await Promise.all(updatePromises);
    const updatedNotes = results.filter(Boolean);

    res.json({
      success: true,
      updated: updatedNotes.length,
      notes: updatedNotes
    });
  } catch (error) {
    logger.error('Toplu guncelleme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Notlar güncellenemedi', details: (error as Error).message });
  }
});

// Not şablonları - requires authentication
router.get("/templates", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const templates = await Note.distinct('lesson');
    res.json(templates);
  } catch (error) {
    logger.error('Sablon hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Şablonlar getirilemedi' });
  }
});

// Not arama - requires authentication
router.get("/search", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { q, semester, academicYear } = req.query;

    if (!q) {
      res.status(400).json({ success: false, error: 'Arama terimi gerekli' });
      return;
    }

    const role = req.user?.role;
    const userId = req.user?.userId;

    const filter: any = {
      isActive: true,
      $or: [
        { studentId: { $regex: q, $options: 'i' } },
        { lesson: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    // Role-based filtering
    if (role === 'student') {
      filter.studentId = userId;
    } else if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (childIds.length === 0) {
        res.json([]);
        return;
      }
      filter.studentId = { $in: childIds };
    }

    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const notes = await Note.find(filter)
      .sort({ lastUpdated: -1 })
      .limit(50)
      .lean();

    res.json(notes);
  } catch (error) {
    logger.error('Arama hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Arama yapılamadı' });
  }
});

// Not yedekleme - requires admin authentication
router.post("/backup", authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { semester, academicYear } = req.body;
    
    if (!semester || !academicYear) {
      res.status(400).json({ success: false, error: 'Dönem ve akademik yıl gerekli' });
      return;
    }

    const notes = await Note.find({
      semester,
      academicYear,
      isActive: true
    }).lean();

    const backupData = {
      timestamp: new Date(),
      semester,
      academicYear,
      count: notes.length,
      notes
    };

    // Burada backup dosyası oluşturulabilir
    // Örneğin: fs.writeFileSync(`backup-${semester}-${academicYear}.json`, JSON.stringify(backupData));

    res.json({
      success: true,
      backup: backupData
    });
  } catch (error) {
    logger.error('Yedekleme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Yedekleme yapılamadı' });
  }
});

export default router; 