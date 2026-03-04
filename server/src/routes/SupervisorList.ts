import { Router } from "express";
import { SupervisorList, ISupervisorList } from "../models/SupervisorList";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateSupervisorList } from "../middleware/validation";
import logger from "../utils/logger";

const router = Router();

// Tüm belletmen nöbet listelerini getir
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { date, supervisorId } = req.query;
    const filter: any = {};
    
    if (date) {
      filter.date = new Date(date as string);
    }
    if (supervisorId) {
      filter.supervisorId = supervisorId;
    }
    
    const supervisors = await SupervisorList.find(filter).sort({ date: -1 });
    res.json(supervisors);
  } catch (error) {
    logger.error('Belletmen listesi getirme hatasi', { error: error instanceof Error ? error.message : error });
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
    logger.error('Belletmen nobeti getirme hatasi', { error: error instanceof Error ? error.message : error });
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
    logger.error('Belletmen nobeti olusturma hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belletmen nöbetini güncelle (sadece admin)
router.put("/:id", authenticateJWT, authorizeRoles(['admin']), validateSupervisorList, async (req, res) => {
  try {
    const supervisor = await SupervisorList.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supervisor) {
      return res.status(404).json({ error: "Belletmen nöbeti bulunamadı" });
    }
    res.json(supervisor);
  } catch (error) {
    logger.error('Belletmen nobeti guncelleme hatasi', { error: error instanceof Error ? error.message : error });
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
    logger.error('Belletmen nobeti silme hatasi', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
