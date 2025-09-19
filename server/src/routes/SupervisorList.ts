import { Router } from "express";
import { SupervisorList, ISupervisorList } from "../models/SupervisorList";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateSupervisorList } from "../middleware/validation";

const router = Router();

// Tüm belletmen nöbet listelerini getir
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { date, supervisorId } = req.query;
    let filter: any = {};
    
    if (date) {
      filter.date = new Date(date as string);
    }
    if (supervisorId) {
      filter.supervisorId = supervisorId;
    }
    
    const supervisors = await SupervisorList.find(filter).sort({ date: -1 });
    res.json(supervisors);
  } catch (error) {
    console.error("Belletmen listesi getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belirli bir belletmen nöbetini getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const supervisor = await SupervisorList.findById(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ error: "Belletmen nöbeti bulunamadı" });
    }
    res.json(supervisor);
  } catch (error) {
    console.error("Belletmen nöbeti getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni belletmen nöbeti ekle (sadece admin)
router.post("/", authenticateJWT, authorizeRoles(['admin']), validateSupervisorList, async (req, res) => {
  try {
    const supervisor = new SupervisorList(req.body);
    await supervisor.save();
    res.status(201).json(supervisor);
  } catch (error) {
    console.error("Belletmen nöbeti oluşturma hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belletmen nöbetini güncelle (sadece admin)
router.put("/:id", authenticateJWT, authorizeRoles(['admin']), validateSupervisorList, async (req, res) => {
  try {
    const supervisor = await SupervisorList.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supervisor) {
      return res.status(404).json({ error: "Belletmen nöbeti bulunamadı" });
    }
    res.json(supervisor);
  } catch (error) {
    console.error("Belletmen nöbeti güncelleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belletmen nöbetini sil (sadece admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const supervisor = await SupervisorList.findByIdAndDelete(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ error: "Belletmen nöbeti bulunamadı" });
    }
    res.json({ success: true, message: "Belletmen nöbeti silindi" });
  } catch (error) {
    console.error("Belletmen nöbeti silme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
