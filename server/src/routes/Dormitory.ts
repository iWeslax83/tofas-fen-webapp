import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { MealList, SupervisorList, MaintenanceRequest, User } from "../models";
import { requireAuth, requireRole } from "../middleware/auth";

// Simple in-memory cache for meals data
const mealsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL (increased from 5 minutes)

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Sadece PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG dosyaları yüklenebilir."));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ===== MEAL LIST ROUTES =====

// Clear meals cache (admin only)
router.delete("/meals/cache", requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    mealsCache.clear();
    res.json({ message: "Meals cache cleared successfully" });
  } catch (error) {
    console.error("Cache clear error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get all meal lists with month/year filtering
router.get("/meals", requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    let filter: any = {};
    
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year as string);
    
    // Create cache key based on filter parameters
    const cacheKey = `meals_${JSON.stringify(filter)}`;
    const now = Date.now();
    
    // Check cache first
    if (mealsCache.has(cacheKey)) {
      const cached = mealsCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log('Serving meals from cache');
        return res.json({
          success: true,
          data: cached.data,
          cached: true,
          timestamp: cached.timestamp
        });
      }
    }
    
    // Fetch from database with timeout
    const mealLists = await Promise.race([
      MealList.find(filter).sort({ createdAt: -1 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]);
    
    // Cache the result
    mealsCache.set(cacheKey, {
      data: mealLists,
      timestamp: now
    });
    
    // Clean up old cache entries (only if cache is getting large)
    if (mealsCache.size > 50) {
      for (const [key, value] of mealsCache.entries()) {
        if ((now - value.timestamp) >= CACHE_TTL) {
          mealsCache.delete(key);
        }
      }
    }
    
    res.json({
      success: true,
      data: mealLists,
      cached: false,
      timestamp: now
    });
  } catch (error) {
    console.error("Meal list fetch error:", error);
    
    // Try to serve from cache even if expired
    const { month, year } = req.query;
    let filter: any = {};
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year as string);
    const cacheKey = `meals_${JSON.stringify(filter)}`;
    
    if (mealsCache.has(cacheKey)) {
      const cached = mealsCache.get(cacheKey);
      console.log('Serving expired cache due to database error');
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        expired: true,
        timestamp: cached.timestamp
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Sunucu hatası",
      message: "Yemek listesi yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin."
    });
  }
});

// Upload meal list (admin only)
router.post("/meals", requireAuth, requireRole(['admin', 'hizmetli']), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Dosya yüklenmedi" });
      return;
    }

    const { month, year } = req.body;
    if (!month || !year) {
      res.status(400).json({ error: "Ay ve yıl bilgisi gerekli" });
      return;
    }

    // Check if already exists for this month/year
    const existing = await MealList.findOne({ month, year });
    if (existing) {
      // Delete old file
      if (fs.existsSync(existing.fileUrl)) {
        fs.unlinkSync(existing.fileUrl);
      }
      // Update existing record
      existing.fileUrl = req.file.path;
      existing.uploadedBy = (req as any).user ? (req as any).user.id : null;
      await existing.save();
      
      // Clear cache for this month/year
      const cacheKey = `meals_${JSON.stringify({ month, year: parseInt(year) })}`;
      mealsCache.delete(cacheKey);
      
      res.json(existing);
    } else {
      // Create new record
      const mealList = new MealList({
        month,
        year: parseInt(year),
        fileUrl: req.file.path,
        uploadedBy: (req as any).user ? (req as any).user.id : null,
      });
      await mealList.save();
      
      // Clear cache for this month/year
      const cacheKey = `meals_${JSON.stringify({ month, year: parseInt(year) })}`;
      mealsCache.delete(cacheKey);
      
      res.status(201).json(mealList);
    }
  } catch (error) {
    console.error("Meal list upload error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Download meal list file
router.get("/meals/:id/download", requireAuth, async (req, res) => {
  try {
    const mealList = await MealList.findById(req.params.id);
    if (!mealList) {
      res.status(404).json({ error: "Dosya bulunamadı" });
      return;
    }

    if (!fs.existsSync(mealList.fileUrl)) {
      res.status(404).json({ error: "Dosya sistemde bulunamadı" });
      return;
    }

    res.download(mealList.fileUrl);
  } catch (error) {
    console.error("Meal list download error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ===== SUPERVISOR LIST ROUTES =====

// Get all supervisor lists with month/year filtering
router.get("/supervisors", requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    let filter: any = {};
    
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year as string);
    
    const supervisorLists = await SupervisorList.find(filter).sort({ createdAt: -1 });
    res.json(supervisorLists);
  } catch (error) {
    console.error("Supervisor list fetch error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Upload supervisor list (admin only)
router.post("/supervisors", requireAuth, requireRole(['admin', 'hizmetli']), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Dosya yüklenmedi" });
      return;
    }

    const { month, year } = req.body;
    if (!month || !year) {
      res.status(400).json({ error: "Ay ve yıl bilgisi gerekli" });
      return;
    }

    // Check if already exists for this month/year
    const existing = await SupervisorList.findOne({ month, year });
    if (existing) {
      // Delete old file
      if (fs.existsSync(existing.fileUrl)) {
        fs.unlinkSync(existing.fileUrl);
      }
      // Update existing record
      existing.fileUrl = req.file.path;
      existing.uploadedBy = (req as any).user ? (req as any).user.id : null;
      await existing.save();
      res.json(existing);
    } else {
      // Create new record
      const supervisorList = new SupervisorList({
        month,
        year: parseInt(year),
        fileUrl: req.file.path,
        uploadedBy: (req as any).user ? (req as any).user.id : null,
      });
      await supervisorList.save();
      res.status(201).json(supervisorList);
    }
  } catch (error) {
    console.error("Supervisor list upload error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Download supervisor list file
router.get("/supervisors/:id/download", requireAuth, async (req, res) => {
  try {
    const supervisorList = await SupervisorList.findById(req.params.id);
    if (!supervisorList) {
      res.status(404).json({ error: "Dosya bulunamadı" });
      return;
    }

    if (!fs.existsSync(supervisorList.fileUrl)) {
      res.status(404).json({ error: "Dosya sistemde bulunamadı" });
      return;
    }

    res.download(supervisorList.fileUrl);
  } catch (error) {
    console.error("Supervisor list download error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ===== MAINTENANCE REQUEST ROUTES =====

// Create maintenance request
router.post("/maintenance", requireAuth, requireRole(['student', 'admin', 'hizmetli']), async (req, res) => {
  try {
    const { roomNumber, issue } = req.body;
    
    if (!roomNumber || !issue) {
      res.status(400).json({ error: "Oda numarası ve sorun açıklaması gerekli" });
      return;
    }

    // For students, use their own ID and validate room number; for admins/hizmetli, find student by room number
    let studentId = (req as any).user.id;
    let studentName = (req as any).user.adSoyad;
    
    if ((req as any).user.rol === 'student') {
      // For students, validate that the room number matches their own
      if ((req as any).user.oda !== roomNumber) {
        res.status(403).json({ error: "Sadece kendi odanız için bakım talebi oluşturabilirsiniz" });
        return;
      }
    } else {
      // Find student by room number for admin/hizmetli
      const student = await User.findOne({ oda: roomNumber, rol: "student" });
      if (!student) {
        res.status(404).json({ error: "Öğrenci bulunamadı" });
        return;
      }
      studentId = student.id;
      studentName = student.adSoyad;
    }

    const maintenanceRequest = new MaintenanceRequest({
      studentId,
      studentName,
      roomNumber,
      issue,
      status: "pending",
      createdAt: new Date(),
    });

    await maintenanceRequest.save();
    res.status(201).json(maintenanceRequest);
  } catch (error) {
    console.error("Maintenance request creation error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get maintenance requests (filtered by role)
router.get("/maintenance", requireAuth, requireRole(['admin', 'hizmetli']), async (req, res) => {
  try {
    const { status, roomNumber } = req.query;
    let filter: any = {};
    
    if (status) filter.status = status;
    if (roomNumber) filter.roomNumber = roomNumber;
    
    const requests = await MaintenanceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'adSoyad');
    
    res.json(requests);
  } catch (error) {
    console.error("Maintenance requests fetch error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get maintenance requests for specific student
router.get("/maintenance/student/:studentId", requireAuth, requireRole(['student', 'admin', 'hizmetli']), async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ 
      studentId: req.params.studentId 
    }).sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error("Student maintenance requests fetch error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get current user's maintenance requests (for students)
router.get("/maintenance/my-requests", requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ 
      studentId: (req as any).user.id 
    }).sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error("User maintenance requests fetch error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Update maintenance request status
router.patch("/maintenance/:id", requireAuth, requireRole(['admin', 'hizmetli']), async (req, res) => {
  try {
    const { status, adminNote, serviceNote } = req.body;
    const updateData: any = { status, updatedAt: new Date() };
    
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (serviceNote !== undefined) updateData.serviceNote = serviceNote;
    
    const request = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!request) {
      res.status(404).json({ error: "Talep bulunamadı" });
      return;
    }
    
    res.json(request);
  } catch (error) {
    console.error("Maintenance request update error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Delete maintenance request
router.delete("/maintenance/:id", requireAuth, requireRole(['admin', 'hizmetli']), async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByIdAndDelete(req.params.id);
    
    if (!request) {
      res.status(404).json({ error: "Talep bulunamadı" });
      return;
    }
    
    res.status(204).end();
  } catch (error) {
    console.error("Maintenance request deletion error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router; 