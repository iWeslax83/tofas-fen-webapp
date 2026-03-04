import { Router } from "express";
import { Request, Response } from "express";
import Announcement from "../models/Announcement";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import logger from "../utils/logger";

const router = Router();

// Tüm duyuruları getir - requires authentication, pagination destekli
router.get("/", authenticateJWT, async (_req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = _req.query as { page?: string; limit?: string };
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [announcements, total] = await Promise.all([
      Announcement.find().sort({ date: -1 }).skip(skip).limit(limitNum),
      Announcement.countDocuments()
    ]);

    return res.json({ data: announcements, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    logger.error('Duyuru getirme hatasi', { error: error instanceof Error ? error.message : error });
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Duyuru oluştur - requires teacher/admin
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { title, content, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Başlık ve içerik gerekli" });
    }

    const announcement = new Announcement({
      title,
      content,
      author: author || "Admin",
      date: new Date().toISOString()
    });

    await announcement.save();
    return res.status(201).json(announcement);
  } catch (error) {
    logger.error('Duyuru olusturma hatasi', { error: error instanceof Error ? error.message : error });
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Duyuru sil - requires teacher/admin
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    
    if (!announcement) {
      return res.status(404).json({ error: "Duyuru bulunamadı" });
    }

    return res.json({ success: true, message: "Duyuru silindi" });
  } catch (error) {
    logger.error('Duyuru silme hatasi', { error: error instanceof Error ? error.message : error });
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router; 