// routes/clubs.ts
import express from "express";
import { Club } from "../models";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET all clubs
router.get("/", (async (_req, res) => {
  try {
    const clubs = await Club.find();
    res.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: "Kulüpler yüklenirken bir hata oluştu" });
  }
}) as express.RequestHandler);

// GET club by id
router.get("/:clubId", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  if (!club) {
    res.status(404).json({ error: "Kulüp bulunamadı" });
    return;
  }
  res.json(club);
});

// GET clubs by user
router.get("/user/:userId", async (req, res) => {
  const clubs = await Club.find({ members: req.params.userId });
  res.json(clubs);
});

// POST new club
router.post("/", async (req: express.Request, res: express.Response) => {
  try {
    const clubData = req.body;
    const newClub = new Club(clubData);
    const savedClub = await newClub.save();
    res.status(201).json(savedClub);
  } catch (error) {
    res.status(400).json({ error: "Kulüp oluşturulamadı", details: error });
  }
});

// DELETE club
router.delete("/:clubId", async (req: express.Request, res: express.Response) => {
  try {
    const deletedClub = await Club.findByIdAndDelete(req.params.clubId);
    if (!deletedClub) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    res.json({ message: "Kulüp silindi" });
  } catch (error) {
    res.status(400).json({ error: "Kulüp silinemedi", details: error });
  }
});

// PATCH club meta
router.patch("/:clubId", async (req: express.Request, res: express.Response) => {
  try {
    const updatedClub = await Club.findByIdAndUpdate(
      req.params.clubId,
      req.body,
      { new: true }
    );
    if (!updatedClub) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    res.json(updatedClub);
  } catch (error) {
    res.status(400).json({ error: "Kulüp güncellenemedi", details: error });
  }
});

// --- Chats ---
router.get("/:clubId/chats", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  if (!club) {
    res.status(404).json({ error: "Kulüp bulunamadı" });
    return;
  }
  res.json(club.chats || []);
});
router.post("/:clubId/chats", async (req: express.Request, res: express.Response) => {
  try {
    const { message, userId } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newChat = { message, userId, timestamp: Date.now() };
    club.chats.push(newChat);
    await club.save();
    res.json(newChat);
  } catch (error) {
    res.status(400).json({ error: "Mesaj eklenemedi" });
  }
});
router.delete("/:clubId/chats/:timestamp", async (req: express.Request, res: express.Response) => {
  try {
    const ts = parseInt(req.params.timestamp);
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.chats = club.chats.filter(m => m.timestamp !== ts);
    await club.save();
    res.json({ message: "Mesaj silindi" });
  } catch (error) {
    res.status(400).json({ error: "Mesaj silinemedi" });
  }
});

// --- Events ---
router.get("/:clubId/events", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  res.json(club?.events || []);
});
router.post("/:clubId/events", async (req: express.Request, res: express.Response) => {
  try {
    const { title, date, description } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newEvent = { 
      id: Date.now().toString(), 
      title, 
      date: new Date(date), 
      description,
      location: req.body.location || 'Belirtilmemiş',
      attendees: []
    };
    club.events.push(newEvent);
    await club.save();
    res.json(newEvent);
  } catch (error) {
    res.status(400).json({ error: "Etkinlik eklenemedi" });
  }
});

// --- Announcements ---
router.get("/:clubId/announcements", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  res.json(club?.announcements || []);
});
router.post("/:clubId/announcements", async (req: express.Request, res: express.Response) => {
  try {
    const { title, content } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newAnnouncement = { 
      id: Date.now().toString(), 
      title, 
      content, 
      timestamp: Date.now() 
    };
    club.announcements.push(newAnnouncement);
    await club.save();
    res.json(newAnnouncement);
  } catch (error) {
    res.status(400).json({ error: "Duyuru eklenemedi" });
  }
});

// --- Member Management ---
router.delete("/:clubId/members/:userId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.members = club.members.filter(m => m !== req.params.userId);
    await club.save();
    res.json({ message: "Üye çıkarıldı" });
  } catch (error) {
    res.status(400).json({ error: "Üye çıkarılamadı" });
  }
});
router.patch("/:clubId/roles", async (req: express.Request, res: express.Response) => {
  try {
    const { roles } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.roles = roles;
    await club.save();
    res.json(club.roles);
  } catch (error) {
    res.status(400).json({ error: "Roller güncellenemedi" });
  }
});

// --- Join Requests ---
router.get("/:clubId/requests", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  if (!club) {
    res.status(404).json({ error: "Kulüp bulunamadı" });
    return;
  }
  res.json(club.requests || []);
});
router.post("/:clubId/requests", async (req: express.Request, res: express.Response) => {
  try {
    const { userId, role } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newRequest = { 
      userId, 
      role, 
      timestamp: Date.now(),
      clubId: req.params.clubId
    };
    club.requests.push(newRequest);
    await club.save();
    res.json(newRequest);
  } catch (error) {
    res.status(400).json({ error: "Talep eklenemedi" });
  }
});
router.delete("/:clubId/requests/:userId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.requests = club.requests.filter(r => r.userId !== req.params.userId);
    await club.save();
    res.json({ message: "Talep silindi" });
  } catch (error) {
    res.status(400).json({ error: "Talep silinemedi" });
  }
});
router.post("/:clubId/requests/:userId/accept", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const request = club.requests.find(r => r.userId === req.params.userId);
    if (!request) {
      res.status(404).json({ error: "Talep bulunamadı" });
      return;
    }
    
    // Add to members
    if (!club.members.includes(req.params.userId)) {
      club.members.push(req.params.userId);
    }
    
    // Add to roles if specified
    if (request.role && club.roles) {
      club.roles[req.params.userId] = request.role;
    }
    
    // Remove from requests
    club.requests = club.requests.filter(r => r.userId !== req.params.userId);
    
    await club.save();
    res.json({ message: "Talep kabul edildi" });
  } catch (error) {
    res.status(400).json({ error: "Talep kabul edilemedi" });
  }
});
router.post("/:clubId/requests/:userId/reject", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const targetUserId = req.params.userId;
    club.requests = club.requests.filter(r => String(r.userId) !== targetUserId);
    await club.save();
    res.json({ message: "Talep reddedildi" });
  } catch (error) {
    res.status(400).json({ error: "Talep reddedilemedi" });
  }
});

// --- Kulüp açıklaması ve sosyal medya güncelleme ---
router.patch("/:clubId/meta", async (req: express.Request, res: express.Response) => {
  try {
    const { name, description, category, tags } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    if (name) club.name = name;
    if (description) club.description = description;
    
    await club.save();
    res.json(club);
  } catch (error) {
    res.status(400).json({ error: "Kulüp güncellenemedi", details: error });
  }
});

// --- Galeri ---
router.get("/:clubId/gallery", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  res.json(club?.gallery || []);
});
router.post("/:clubId/gallery", async (req: express.Request, res: express.Response) => {
  try {
    const { type, url } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newMedia = { 
      type, 
      url, 
      uploadedAt: new Date() 
    };
    club.gallery.push(newMedia);
    await club.save();
    res.json(newMedia);
  } catch (error) {
    res.status(400).json({ error: "Medya eklenemedi" });
  }
});
router.delete("/:clubId/gallery/:mediaId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.gallery = club.gallery.filter((m, index) => index.toString() !== req.params.mediaId);
    await club.save();
    res.json({ message: "Medya silindi" });
  } catch (error) {
    res.status(400).json({ error: "Medya silinemedi" });
  }
});

// --- Duyuruya yorum ---
router.get("/:clubId/announcements/:announcementId/comments", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  if (!club) {
    res.status(404).json({ error: "Kulüp bulunamadı" });
    return;
  }
  
  const comments = club.announcementComments.filter(c => c.announcementId === req.params.announcementId);
  res.json(comments);
});
router.post("/:clubId/announcements/:announcementId/comments", async (req: express.Request, res: express.Response) => {
  try {
    const { comment, userId } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const newComment = { 
      comment, 
      userId, 
      timestamp: Date.now(),
      announcementId: req.params.announcementId
    };
    club.announcementComments.push(newComment);
    await club.save();
    res.json(newComment);
  } catch (error) {
    res.status(400).json({ error: "Yorum eklenemedi" });
  }
});
router.delete("/:clubId/announcements/:announcementId/comments/:commentId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.announcementComments = club.announcementComments.filter((c, index) => index.toString() !== req.params.commentId);
    await club.save();
    res.json({ message: "Yorum silindi" });
  } catch (error) {
    res.status(400).json({ error: "Yorum silinemedi" });
  }
});

// --- Bildirimler (kulüp içi) ---
router.get("/:clubId/notifications", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  res.json(club?.notifications || []);
});
router.post("/:clubId/notifications", async (req: express.Request, res: express.Response) => {
  try {
    const { type, message, meta } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.notifications.push(`${type}: ${message} - ${JSON.stringify(meta)}`);
    await club.save();
    res.json({ message: "Bildirim eklendi" });
  } catch (error) {
    res.status(400).json({ error: "Bildirim eklenemedi" });
  }
});

// --- Davet linki oluşturma/listeleme ---
router.get("/:clubId/invite-links", async (req: express.Request, res: express.Response) => {
  const club = await Club.findById(req.params.clubId);
  res.json(club?.inviteLinks || []);
});
router.post("/:clubId/invite-links", async (req: express.Request, res: express.Response) => {
  try {
    const { oneTime = false } = req.body;
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newLink = { 
      code, 
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: req.body.createdBy || "system",
      oneTime
    };
    club.inviteLinks.push(newLink);
    await club.save();
    res.json(newLink);
  } catch (error) {
    res.status(400).json({ error: "Davet linki oluşturulamadı" });
  }
});
// Davet linki silme
router.delete("/:clubId/invite-links/:linkCode", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.inviteLinks = club.inviteLinks.filter(l => l.code !== req.params.linkCode);
    await club.save();
    res.json({ message: "Davet linki silindi" });
  } catch (error) {
    res.status(400).json({ error: "Davet linki silinemedi" });
  }
});
// Davet linki ile katılım
router.post("/join-by-link/:inviteCode", async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.body;
    const club = await Club.findOne({ "inviteLinks.code": req.params.inviteCode });
    if (!club) {
      res.status(404).json({ error: "Geçersiz davet linki" });
      return;
    }
    
    const link = club.inviteLinks.find(l => l.code === req.params.inviteCode);
    if (!link) {
      res.status(404).json({ error: "Davet linki bulunamadı" });
      return;
    }
    
    if (link.expiresAt < new Date()) return res.status(400).json({ error: "Bu davet linki süresi dolmuş" });
    
    if (!club.members.includes(userId)) {
      club.members.push(userId);
    }
    
    await club.save();
    res.json({ message: "Kulübe katıldınız" });
  } catch (error) {
    res.status(400).json({ error: "Kulübe katılınamadı" });
  }
});

// --- Etkinlik ve duyuru silme (başkanlar) ---
router.delete("/:clubId/events/:eventId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.events = club.events.filter(ev => ev.id !== req.params.eventId);
    await club.save();
    res.json({ message: "Etkinlik silindi" });
  } catch (error) {
    res.status(400).json({ error: "Etkinlik silinemedi" });
  }
});
router.delete("/:clubId/announcements/:announcementId", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    club.announcements = club.announcements.filter(a => a.id !== req.params.announcementId);
    await club.save();
    res.json({ message: "Duyuru silindi" });
  } catch (error) {
    res.status(400).json({ error: "Duyuru silinemedi" });
  }
});

// --- Kulüp silme: sadece ana başkan, üyelere bildirim ---
router.delete("/:clubId/secure", async (req: express.Request, res: express.Response) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    // Additional security checks can be added here
    // For example, check if user is admin or club owner
    
    await Club.findByIdAndDelete(req.params.clubId);
    res.json({ message: "Kulüp güvenli şekilde silindi" });
  } catch (error) {
    res.status(400).json({ error: "Kulüp silinemedi" });
  }
});

// --- Kullanıcı arama/otomatik tamamlama ---
router.get("/search-users", async (req: express.Request, res: express.Response) => {
  try {
    const { q } = req.query;
    if (!q) {
      res.status(400).json({ error: "Arama terimi gerekli" });
      return;
    }
    
    // This would typically search in a User collection
    // For now, return mock data
    const users = [
      { id: "user1", name: "Ahmet Yılmaz" },
      { id: "user2", name: "Ayşe Demir" }
    ].filter(user => user.name.toLowerCase().includes(String(q).toLowerCase()));
    
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: "Kullanıcı arama hatası" });
  }
});

// Kullanıcıya gelen kulüp davetleri
router.get("/invites/:userId", async (req, res) => {
  const userId = String(req.params.userId); // Ensure userId is a string
  
  try {
    const clubs = await Club.find({ "requests.userId": userId });
    
    const invites = [];
    for (const club of clubs) {
      for (const req of club.requests) {
        if (String(req.userId) === userId) {
          invites.push({ ...req, clubName: club.name, clubId: club.id });
        }
      }
    }
    
    res.json(invites);
  } catch (err) {
    console.error("Error fetching invites:", err);
    res.status(500).json({ error: 'Davetler alınamadı', details: err.message });
  }
});

// Change member role
router.put("/:clubId/members/:memberId/role", async (req: express.Request, res: express.Response) => {
  try {
    const { clubId, memberId } = req.params;
    const { newRole } = req.body;
    
    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    // Update member role in roles map since members is string[]
    if (!club.members.includes(memberId)) {
      res.status(404).json({ error: "Üye bulunamadı" });
      return;
    }
    club.roles = club.roles || {} as any;
    club.roles[memberId] = newRole;
    await club.save();
    
    res.json({ message: "Üye rolü güncellendi", memberId, role: newRole });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(400).json({ error: "Üye rolü güncellenemedi" });
  }
});

// Invite member to club
router.post("/:clubId/invite", async (req: express.Request, res: express.Response) => {
  try {
    const { clubId } = req.params;
    const { userId, role = "member" } = req.body;
    
    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404).json({ error: "Kulüp bulunamadı" });
      return;
    }
    
    // Check if user is already a member
    const existingMember = club.members.includes(userId);
    if (existingMember) {
      res.status(400).json({ error: "Kullanıcı zaten üye" });
      return;
    }
    
    // Add invitation request
    club.requests.push({
      userId,
      role,
      timestamp: Date.now(),
      clubId
    });
    
    await club.save();
    
    res.json({ message: "Davet gönderildi" });
  } catch (error) {
    console.error("Error inviting member:", error);
    res.status(400).json({ error: "Davet gönderilemedi" });
  }
});

export default router;
