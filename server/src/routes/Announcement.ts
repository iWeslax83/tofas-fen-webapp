import { Router } from "express";
import { Request, Response } from "express";
import Announcement from "../models/Announcement";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateAnnouncement } from "../middleware/validation";
import { User } from "../models/User";

const router = Router();

// Tüm duyuruları getir
router.get("/", authenticateJWT, async (_req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find().sort({ date: -1 });
    return res.json(announcements);
  } catch (error) {
    console.error("Duyuru getirme hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Rol bazlı (ve veli için çocuk sınıflarına göre) duyuruları getir
router.get("/role/:role", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const authUser = req.user as any;

    // Baz rol listesi
    const rolesToCheck = [role];

    // Veliler, kendi rollerine ek olarak öğrenciler için giden duyuruları da görebilsin
    if (role === "parent") {
      rolesToCheck.push("student");
    }

    const roleFilter = {
      $or: [
        { targetRoles: { $exists: false } },
        { targetRoles: { $size: 0 } },
        { targetRoles: { $in: rolesToCheck } }
      ]
    };

    let classFilter: any = null;

    // Öğrenci için sınıf bazlı filtre
    if (role === "student") {
      const classCode =
        authUser?.sinif && authUser?.sube
          ? `${authUser.sinif}${authUser.sube}`
          : undefined;

      if (classCode) {
        classFilter = {
          $or: [
            { targetClasses: { $exists: false } },
            { targetClasses: { $size: 0 } },
            { targetClasses: classCode }
          ]
        };
      }
    }

    // Veli için çocukların sınıflarına göre filtre
    if (role === "parent") {
      const parent = await User.findOne({ id: authUser.userId })
        .select("childId")
        .lean() as any;

      if (parent?.childId?.length) {
        const children = await User.find({
          id: { $in: parent.childId },
          rol: "student",
        })
          .select("sinif sube")
          .lean() as any[];

        const classCodes = children
          .map((child) =>
            child.sinif && child.sube ? `${child.sinif}${child.sube}` : null
          )
          .filter((c): c is string => !!c);

        if (classCodes.length > 0) {
          classFilter = {
            $or: [
              { targetClasses: { $exists: false } },
              { targetClasses: { $size: 0 } },
              { targetClasses: { $in: classCodes } }
            ]
          };
        }
      }
    }

    const mongoFilter: any = classFilter
      ? { $and: [roleFilter, classFilter] }
      : roleFilter;

    const announcements = await Announcement.find(mongoFilter).sort({ date: -1 });
    return res.json(announcements);
  } catch (error) {
    console.error("Rol bazlı duyuru getirme hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Duyuru oluştur - /create endpoint (sadece öğretmen ve admin)
// Bu route /:id route'undan ÖNCE olmalı, yoksa Express "create"i id olarak algılar
router.post("/create", authenticateJWT, authorizeRoles(['teacher', 'admin']), validateAnnouncement, async (req: Request, res: Response) => {
  try {
    const { title, content, author, targetRoles, targetClasses, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Başlık ve içerik gerekli" });
    }

    const announcement = new Announcement({
      title,
      content,
      author: author || (req.user as any)?.adSoyad || (req.user as any)?.name || "Admin",
      date: new Date().toISOString(),
      targetRoles: targetRoles || [],
      targetClasses: targetClasses || [],
      priority: priority || 'medium'
    });

    await announcement.save();
    return res.status(201).json(announcement);
  } catch (error) {
    console.error("Duyuru oluşturma hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
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
    return res.status(201).json(announcement);
  } catch (error) {
    console.error("Duyuru oluşturma hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belirli bir duyuruyu getir
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: "Duyuru bulunamadı" });
    }
    return res.json(announcement);
  } catch (error) {
    console.error("Duyuru getirme hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
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

    return res.json({ success: true, message: "Duyuru silindi" });
  } catch (error) {
    console.error("Duyuru silme hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router; 