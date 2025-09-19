import { Router } from "express";
import Note, { INote } from "../models/Note";
import { ExcelImportService } from "../services/excelImportService";
import { Request, Response } from "express";

const router = Router();

// Tüm notları getir (filtreleme ile)
router.get("/", async (req: Request, res: Response) => {
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

    if (studentId) filter.studentId = studentId;
    if (lesson) filter.lesson = lesson;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (source) filter.source = source;
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (classSection) filter.classSection = classSection;

    const notes = await Note.find(filter)
      .sort({ lastUpdated: -1 })
      .lean();

    res.json(notes);
  } catch (error) {
    console.error('Notları getirme hatası:', error);
    res.status(500).json({ error: 'Notlar getirilemedi' });
  }
});

// Belirli bir öğrencinin notlarını getir
router.get("/student/:studentId", async (req: Request, res: Response) => {
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
    console.error('Öğrenci notları getirme hatası:', error);
    res.status(500).json({ error: 'Öğrenci notları getirilemedi' });
  }
});

// Yeni not ekle
router.post("/", async (req: Request, res: Response) => {
  try {
    const noteData = req.body;
    noteData.source = 'manual';
    
    const note = new Note(noteData);
    await note.save();
    
    res.status(201).json(note);
  } catch (error) {
    console.error('Not ekleme hatası:', error);
    res.status(400).json({ error: 'Not eklenemedi', details: error.message });
  }
});

// Not güncelle
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const note = await Note.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!note) {
      res.status(404).json({ error: 'Not bulunamadı' });
      return;
    }
    
    res.json(note);
  } catch (error) {
    console.error('Not güncelleme hatası:', error);
    res.status(400).json({ error: 'Not güncellenemedi', details: error.message });
  }
});

// Not sil (soft delete)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    );
    
    if (!note) {
      res.status(404).json({ error: 'Not bulunamadı' });
      return;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Not silme hatası:', error);
    res.status(400).json({ error: 'Not silinemedi', details: error.message });
  }
});

// Excel dosyasından notları içe aktar
router.post("/import-excel", async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Dosya yüklenmedi' });
      return;
    }

    const { semester, academicYear, source } = req.body;
    
    if (!semester || !academicYear) {
      res.status(400).json({ error: 'Dönem ve akademik yıl bilgisi gerekli' });
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
    
    // Notları veritabanına kaydet
    const savedNotes = [];
    for (const noteData of validation.valid) {
      const note = new Note({
        studentId: noteData.studentId,
        lesson: noteData.subject,
        grade: noteData.note,
        date: new Date(noteData.date),
        description: noteData.description,
        semester,
        academicYear,
        source: source || 'excel',
        isActive: true
      });
      await note.save();
      savedNotes.push(note);
    }

    res.json({
      success: true,
      imported: savedNotes.length,
      errors: validation.errors,
      message: `${savedNotes.length} not başarıyla içe aktarıldı`
    });
  } catch (error) {
    console.error('Excel import hatası:', error);
    res.status(500).json({ error: 'Excel dosyası işlenemedi', details: error.message });
  }
});

// Not istatistikleri
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { semester, academicYear, gradeLevel, classSection } = req.query;
    
    const filter: any = { isActive: true };
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
    console.error('İstatistik hatası:', error);
    res.status(500).json({ error: 'İstatistikler hesaplanamadı' });
  }
});

// Toplu not güncelleme
router.put("/bulk-update", async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    
    if (!Array.isArray(notes)) {
      res.status(400).json({ error: 'Notlar dizisi gerekli' });
      return;
    }

    const updatePromises = notes.map(async (noteUpdate: any) => {
      const { id, ...updateData } = noteUpdate;
      return Note.findByIdAndUpdate(id, updateData, { new: true });
    });

    const updatedNotes = await Promise.all(updatePromises);
    
    res.json({
      success: true,
      updated: updatedNotes.length,
      notes: updatedNotes
    });
  } catch (error) {
    console.error('Toplu güncelleme hatası:', error);
    res.status(500).json({ error: 'Notlar güncellenemedi', details: error.message });
  }
});

// Not şablonları
router.get("/templates", async (req: Request, res: Response) => {
  try {
    const templates = await Note.distinct('lesson');
    res.json(templates);
  } catch (error) {
    console.error('Şablon hatası:', error);
    res.status(500).json({ error: 'Şablonlar getirilemedi' });
  }
});

// Not arama
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, semester, academicYear } = req.query;
    
    if (!q) {
      res.status(400).json({ error: 'Arama terimi gerekli' });
      return;
    }

    const filter: any = { 
      isActive: true,
      $or: [
        { studentId: { $regex: q, $options: 'i' } },
        { lesson: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const notes = await Note.find(filter)
      .sort({ lastUpdated: -1 })
      .limit(50)
      .lean();

    res.json(notes);
  } catch (error) {
    console.error('Arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

// Not yedekleme
router.post("/backup", async (req: Request, res: Response) => {
  try {
    const { semester, academicYear } = req.body;
    
    if (!semester || !academicYear) {
      res.status(400).json({ error: 'Dönem ve akademik yıl gerekli' });
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
    console.error('Yedekleme hatası:', error);
    res.status(500).json({ error: 'Yedekleme yapılamadı' });
  }
});

export default router; 