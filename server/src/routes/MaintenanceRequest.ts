import { Router } from "express";
import { MaintenanceRequest, IMaintenanceRequest } from "../models/MaintenanceRequest";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateMaintenanceRequest } from "../middleware/validation";

const router = Router();

// Tüm bakım taleplerini getir
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { status, priority, roomNumber } = req.query;
    let filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (roomNumber) {
      filter.roomNumber = roomNumber;
    }
    
    const requests = await MaintenanceRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Bakım talepleri getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Kullanıcının kendi bakım taleplerini getir
router.get("/my-requests", authenticateJWT, async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ 
      studentId: req.user.userId 
    }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Kullanıcı bakım talepleri getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belirli bir bakım talebini getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Bakım talebi bulunamadı" });
    }
    res.json(request);
  } catch (error) {
    console.error("Bakım talebi getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni bakım talebi oluştur (öğrenci ve öğretmen)
router.post("/", authenticateJWT, authorizeRoles(['student', 'teacher', 'admin']), validateMaintenanceRequest, async (req, res) => {
  try {
    const maintenanceRequest = new MaintenanceRequest({
      ...req.body,
      studentId: req.user.userId,
      status: 'pending'
    });
    await maintenanceRequest.save();
    res.status(201).json(maintenanceRequest);
  } catch (error) {
    console.error("Bakım talebi oluşturma hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Bakım talebini güncelle (sadece oluşturan kişi veya admin)
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Bakım talebi bulunamadı" });
    }
    
    // Sadece oluşturan kişi veya admin güncelleyebilir
    if (request.studentId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    
    const updated = await MaintenanceRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    console.error("Bakım talebi güncelleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Bakım talebi durumunu güncelle (sadece admin ve bakım personeli)
router.patch("/:id/status", authenticateJWT, authorizeRoles(['admin', 'maintenance_staff']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id, 
      { status, notes, updatedAt: new Date() }, 
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: "Bakım talebi bulunamadı" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Bakım talebi durum güncelleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Bakım talebini sil (sadece oluşturan kişi veya admin)
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Bakım talebi bulunamadı" });
    }
    
    // Sadece oluşturan kişi veya admin silebilir
    if (request.studentId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    
    await MaintenanceRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Bakım talebi silindi" });
  } catch (error) {
    console.error("Bakım talebi silme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
