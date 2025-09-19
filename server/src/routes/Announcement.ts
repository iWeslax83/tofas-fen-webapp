import { Router } from "express";
import { Request, Response } from "express";
import Announcement from "../models/Announcement";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateAnnouncement } from "../middleware/validation";

const router = Router();

// Tüm duyuruları getir
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find().sort({ date: -1 });
    res.json(announcements);
  } catch (error) {
    console.error("Duyuru getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Duyuru oluştur (sadece öğretmen ve admin)
router.post("/", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateAnnouncement, async (req: Request, res: Response) => {
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
    res.status(201).json(announcement);
  } catch (error) {
    console.error("Duyuru oluşturma hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Duyuru sil (sadece oluşturan kişi veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    
    if (!announcement) {
      return res.status(404).json({ error: "Duyuru bulunamadı" });
    }

    res.json({ success: true, message: "Duyuru silindi" });
  } catch (error) {
    console.error("Duyuru silme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router; 