import { Router } from "express";
import { Request, Response } from "express";
import { User } from "../models";
import bcrypt from "bcryptjs";
import { sendMail } from "../mailService";
import { authenticateJWT } from "../utils/jwt";

const router = Router();

// Geçici kodlar (memory, production'da redis önerilir)
const emailCodes: Record<string, { code: string; email: string; expires: number }> = {};

// E-posta ekle veya değiştir: kod gönder
router.post("/email/send-code", async (req, res) => {
  const { userId, email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli kod
  emailCodes[userId] = { code, email, expires: Date.now() + 10 * 60 * 1000 };
  // Mail gönder
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 24px; background: #fafbfc;">
      <h2 style="color: #8A1538;">E-posta Doğrulama</h2>
      <p>Merhaba,</p>
      <p>Hesabınıza e-posta eklemek veya e-posta adresinizi değiştirmek için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 18px 0; color: #222;">${code}</div>
      <p>Alternatif olarak, aşağıdaki butona tıklayarak işlemi hızlıca tamamlayabilirsiniz:</p>
      <a href="{LINK}" style="display: inline-block; background: #8A1538; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 12px 0;">E-posta Doğrulama Sayfasına Git</a>
      <p style="font-size: 13px; color: #444; margin-top: 18px;">Buton çalışmazsa, bu bağlantıyı tarayıcınıza kopyalayın:<br><span style="word-break: break-all;">{LINK}</span></p>
      <p style="font-size: 13px; color: #888;">Tofaş Fen Lisesi Bilgi Sistemi</p>
    </div>
  `;
  // {LINK} yerine frontend doğrulama sayfası linki eklenmeli
  const link = `http://localhost:5173/ayarlar?verifyCode=${code}&userId=${userId}`;
  await sendMail(email, "E-posta Doğrulama Kodu", html.replaceAll("{LINK}", link), true);
  res.json({ success: true });
});

// Kod doğrula ve e-posta ekle/değiştir
router.post("/email/verify-code", async (req, res) => {
  const { userId, code } = req.body;
  const entry = emailCodes[userId];
  if (!entry || entry.code !== code || entry.expires < Date.now()) {
    res.status(400).json({ error: "Kod hatalı veya süresi doldu" });
    return;
  }
  await User.updateOne({ id: userId }, { email: entry.email, emailVerified: true });
  delete emailCodes[userId];
  console.log(`[EMAIL VERIFIED] Kullanıcı: ${userId} | Zaman: ${new Date().toISOString()}`);
  res.json({ success: true });
});

// E-posta değiştirirken eski e-posta'ya kod gönder
router.post("/email/send-old-code", async (req, res) => {
  const { userId } = req.body;
  const user = await User.findOne({ id: userId }).select('+sifre');
  if (!user?.email) {
    res.status(400).json({ error: "Kayıtlı e-posta yok" });
    return;
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli kod
  emailCodes[userId] = { code, email: user.email, expires: Date.now() + 10 * 60 * 1000 };
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 24px; background: #fafbfc;">
      <h2 style="color: #8A1538;">E-posta Değişikliği Onayı</h2>
      <p>Merhaba,</p>
      <p>Mevcut e-posta adresinizi değiştirmek için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 18px 0; color: #222;">${code}</div>
      <p>Alternatif olarak, aşağıdaki butona tıklayarak işlemi hızlıca tamamlayabilirsiniz:</p>
      <a href="{LINK}" style="display: inline-block; background: #8A1538; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 12px 0;">E-posta Değişikliği Sayfasına Git</a>
      <p style="font-size: 13px; color: #444; margin-top: 18px;">Buton çalışmazsa, bu bağlantıyı tarayıcınıza kopyalayın:<br><span style="word-break: break-all;">{LINK}</span></p>
      <p style="font-size: 13px; color: #888;">Tofaş Fen Lisesi Bilgi Sistemi</p>
    </div>
  `;
  const link = `http://localhost:5173/ayarlar?verifyCode=${code}&userId=${userId}`;
  await sendMail(user.email, "E-posta Değişikliği Onay Kodu", html.replaceAll("{LINK}", link), true);
  res.json({ success: true });
});

// Veli-öğrenci eşleştirme
router.post("/parent-child-link", async (req, res) => {
  try {
    const { parentId, childId } = req.body;
    
    if (!parentId || !childId) {
      return res.status(400).json({ error: "Veli ID ve öğrenci ID gerekli" });
    }

    // Veli ve öğrenci var mı kontrol et
    const parent = await User.findOne({ id: parentId, rol: "parent" });
    const child = await User.findOne({ id: childId, rol: "student" });

    if (!parent) {
      return res.status(404).json({ error: "Veli bulunamadı" });
    }

    if (!child) {
      return res.status(404).json({ error: "Öğrenci bulunamadı" });
    }

    // Veli'nin childId array'ine öğrenci ID'sini ekle
    const updatedChildIds = parent.childId || [];
    if (!updatedChildIds.includes(childId)) {
      updatedChildIds.push(childId);
    }

    // Öğrenci'nin parentId'sini güncelle
    await User.updateOne({ id: childId }, { parentId: parentId });
    
    // Veli'nin childId'sini güncelle
    await User.updateOne({ id: parentId }, { childId: updatedChildIds });

    console.log(`[PARENT-CHILD LINKED] Veli: ${parentId} | Öğrenci: ${childId} | Zaman: ${new Date().toISOString()}`);
    
    res.json({ 
      success: true, 
      message: "Veli-öğrenci eşleştirmesi başarılı",
      parentId,
      childId,
      updatedChildIds
    });
  } catch (error) {
    console.error("Veli-öğrenci eşleştirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Veli'nin çocuklarını getir
router.get("/parent/:parentId/children", async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const parent = await User.findOne({ id: parentId, rol: "parent" });
    if (!parent) {
      return res.status(404).json({ error: "Veli bulunamadı" });
    }

    const childIds = parent.childId || [];
    const children = await User.find({ 
      id: { $in: childIds }, 
      rol: "student" 
    }).select('id adSoyad sinif sube oda pansiyon');

    res.json({
      success: true,
      parent: {
        id: parent.id,
        adSoyad: parent.adSoyad,
        childId: parent.childId
      },
      children: children
    });
  } catch (error) {
    console.error("Veli çocukları getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Kod doğrula ve yeni e-posta'ya kod gönder
router.post("/email/verify-old-code", async (req, res) => {
  const { userId, code, newEmail } = req.body;
  const entry = emailCodes[userId];
  if (!entry || entry.code !== code || entry.expires < Date.now()) {
    res.status(400).json({ error: "Kod hatalı veya süresi doldu" });
    return;
  }
  // Yeni e-posta'ya kod gönder
  const newCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli kod
  emailCodes[userId] = { code: newCode, email: newEmail, expires: Date.now() + 10 * 60 * 1000 };
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 24px; background: #fafbfc;">
      <h2 style="color: #8A1538;">Yeni E-posta Doğrulama</h2>
      <p>Merhaba,</p>
      <p>Yeni e-posta adresinizi doğrulamak için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 18px 0; color: #222;">${newCode}</div>
      <p>Alternatif olarak, aşağıdaki butona tıklayarak işlemi hızlıca tamamlayabilirsiniz:</p>
      <a href="{LINK}" style="display: inline-block; background: #8A1538; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 12px 0;">Yeni E-posta Doğrulama Sayfasına Git</a>
      <p style="font-size: 13px; color: #444; margin-top: 18px;">Buton çalışmazsa, bu bağlantıyı tarayıcınıza kopyalayın:<br><span style="word-break: break-all;">{LINK}</span></p>
      <p style="font-size: 13px; color: #888;">Tofaş Fen Lisesi Bilgi Sistemi</p>
    </div>
  `;
  const link = `http://localhost:5173/ayarlar?verifyCode=${newCode}&userId=${userId}`;
  await sendMail(newEmail, "Yeni E-posta Doğrulama Kodu", html.replaceAll("{LINK}", link), true);
  res.json({ success: true });
});

// Kod doğrula ve e-posta değiştir
router.post("/email/verify-new-code", async (req, res) => {
  const { userId, code } = req.body;
  const entry = emailCodes[userId];
  if (!entry || entry.code !== code || entry.expires < Date.now()) {
    res.status(400).json({ error: "Kod hatalı veya süresi doldu" });
    return;
  }
  await User.updateOne({ id: userId }, { email: entry.email, emailVerified: true });
  delete emailCodes[userId];
  console.log(`[EMAIL CHANGED] Kullanıcı: ${userId} | Zaman: ${new Date().toISOString()}`);
  res.json({ success: true });
});

// Şifre değiştir
router.post("/change-password", authenticateJWT, async (req, res) => {
  try {
    console.log("Password change request received");
    console.log("Request body:", req.body);
    console.log("User from JWT:", (req as any).user);
    
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.userId;
    
    console.log("Extracted data:", { userId, currentPassword: currentPassword ? "***" : "undefined", newPassword: newPassword ? "***" : "undefined" });
    
    if (!currentPassword || !newPassword) {
      console.log("Missing password fields");
      res.status(400).json({ error: "Mevcut şifre ve yeni şifre gereklidir" });
      return;
    }
    
    const user = await User.findOne({ id: userId }).select('+sifre');
    console.log("User found:", user ? "Yes" : "No");
    
    if (!user) {
      console.log("User not found for userId:", userId);
      res.status(404).json({ error: "Kullanıcı bulunamadı" });
      return;
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.sifre || '');
    console.log("Password validation:", isValidPassword ? "Valid" : "Invalid");
    
    if (!isValidPassword) {
      res.status(400).json({ error: "Mevcut şifre yanlış" });
      return;
    }
    
    if (newPassword.length < 6) {
      console.log("New password too short:", newPassword.length);
      res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalı." });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ id: userId }, { sifre: hashedPassword });
    console.log(`[PASSWORD CHANGED] Kullanıcı: ${userId} | Zaman: ${new Date().toISOString()}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Kullanıcı bilgilerini güncelle
router.put("/:userId/update", async (req, res) => {
  const { userId } = req.params;
  const user = await User.findOne({ id: userId }).select('+sifre');
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  const updateData = req.body;
  await User.updateOne({ id: userId }, updateData);
  res.json({ success: true });
});

// Kullanıcı oluştur (admin)
router.post("/", async (req, res) => {
  const { id, adSoyad, rol, sifre } = req.body;
  if (!id || !adSoyad || !rol || !sifre) {
    res.status(400).json({ error: 'ID, Ad Soyad, Rol ve Şifre zorunludur.' });
    return;
  }
  const hashedPassword = await bcrypt.hash(sifre, 10);
  const newUser = new User({
    id,
    adSoyad,
    rol,
    sifre: hashedPassword
  });
  await newUser.save();
  res.status(201).json({ success: true });
});

// Kullanıcı sil (admin)
router.delete("/:userId", async (req, res) => {
  const { userId } = req.params;
  await User.deleteOne({ id: userId });
  res.status(204).end();
});

// Kullanıcı güncelle (admin)
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;
  if (updateData.sifre) {
    updateData.sifre = await bcrypt.hash(updateData.sifre, 10);
  }
  await User.updateOne({ id: userId }, updateData);
  res.json({ success: true });
});

// Tüm kullanıcıları getir (admin) - En sona taşındı
router.get("/", async (req, res) => {
  const users = await User.find().select('-sifre');
  res.json(users);
});

// Get users by role
router.get("/role/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    
    const filter: any = { rol: role };
    
    // Add search filter if provided
    if (search) {
      filter.adSoyad = { $regex: search, $options: 'i' };
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const users = await User.find(filter)
      .select('-sifre')
      .skip(skip)
      .limit(Number(limit))
      .sort({ adSoyad: 1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting users by role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info (different from /api/auth/me)
router.get("/me", async (req, res) => {
  try {
    // Get user ID from header (JWT middleware will be implemented later)
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const user = await User.findOne({ id: userId }).select('-sifre');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId }).select('-sifre');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get parent's children
router.get("/:userId/children", async (req, res) => {
  try {
    const { userId } = req.params;
    const parent = await User.findOne({ id: userId, rol: "parent" });
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }
    
    if (!parent.childId || parent.childId.length === 0) {
      return res.json([]);
    }
    
    const children = await User.find({ id: { $in: parent.childId } }).select('-sifre');
    res.json(children);
  } catch (error) {
    console.error('Error getting children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get child's parents
router.get("/:userId/parents", async (req, res) => {
  try {
    const { userId } = req.params;
    const child = await User.findOne({ id: userId, rol: "student" });
    if (!child) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const parents = await User.find({ 
      childId: { $in: [userId] },
      rol: "parent" 
    }).select('-sifre');
    
    res.json(parents);
  } catch (error) {
    console.error('Error getting parents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove parent-child link
router.delete("/parent-child-link", async (req, res) => {
  try {
    const { parentId, childId } = req.body;
    
    if (!parentId || !childId) {
      return res.status(400).json({ error: "Veli ID ve öğrenci ID gerekli" });
    }

    const parent = await User.findOne({ id: parentId, rol: "parent" });
    if (!parent) {
      return res.status(404).json({ error: "Veli bulunamadı" });
    }

    // Remove child from parent's childId array
    const updatedChildIds = parent.childId?.filter(id => id !== childId) || [];
    await User.updateOne({ id: parentId }, { childId: updatedChildIds });
    
    console.log(`[PARENT-CHILD UNLINKED] Veli: ${parentId} | Öğrenci: ${childId} | Zaman: ${new Date().toISOString()}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unlinking parent-child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
