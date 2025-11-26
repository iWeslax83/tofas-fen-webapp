import { Router } from "express";
import { Request, Response } from "express";
import { User } from "../models";
import bcrypt from "bcryptjs";
import { authenticateJWT } from "../utils/jwt";

const router = Router();

// Parent-child link
router.post("/parent-child-link", async (req, res) => {
  const { parentId, childId } = req.body;
  const parent = await User.findOne({ id: parentId });
  const child = await User.findOne({ id: childId });
  if (!parent || !child) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  if (parent.rol !== "parent" || child.rol !== "student") {
    res.status(400).json({ error: "Geçersiz rol" });
    return;
  }
  if (!parent.children) parent.children = [];
  if (!parent.children.includes(childId)) {
    parent.children.push(childId);
    await parent.save();
  }
  res.json({ success: true });
});

// Get parent's children
router.get("/parent/:parentId/children", async (req, res) => {
  const { parentId } = req.params;
  const parent = await User.findOne({ id: parentId });
  if (!parent) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  const children = await User.find({ id: { $in: parent.children || [] } }).select('-sifre');
  res.json(children);
});

// Şifre değiştirme endpoint'i kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

// Update user
router.put("/:userId/update", async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;
  
  // Remove sensitive fields
  delete updateData.sifre;
  delete updateData.id;
  delete updateData.rol;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  try {
    const user = await User.findOneAndUpdate(
      { id: userId },
      updateData,
      { new: true, runValidators: true }
    ).select('-sifre');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post("/create", async (req, res) => {
  const { id, adSoyad, tckn, sifre, rol, sinif, sube, oda, pansiyon, email } = req.body;
  
  if (!id || !adSoyad || !rol) {
    res.status(400).json({ error: "Gerekli alanlar eksik" });
    return;
  }

  const existingUser = await User.findOne({ id });
  if (existingUser) {
    res.status(400).json({ error: "Kullanıcı zaten mevcut" });
    return;
  }

  // TCKN varsa kullan, yoksa eski şifre sistemine geri dön (geriye dönük uyumluluk)
  let passwordField: any = {};
  if (tckn) {
    // TCKN kullanılıyor - şifre olarak TCKN kaydedilir (hash'lenmez)
    passwordField.tckn = tckn;
  } else if (sifre) {
    // Eski sistem: bcrypt ile hash'le (geriye dönük uyumluluk)
    const hashedPassword = await bcrypt.hash(sifre, 10);
    passwordField.sifre = hashedPassword;
  } else {
    res.status(400).json({ error: "TCKN veya şifre gereklidir" });
    return;
  }

  const user = new User({
    id,
    adSoyad,
    ...passwordField,
    rol,
    sinif,
    sube,
    oda,
    pansiyon,
    email,
    isActive: true
  });

  await user.save();
  res.status(201).json({ success: true });
});

// Delete user (admin)
router.delete("/:userId", async (req, res) => {
  const { userId } = req.params;
  await User.deleteOne({ id: userId });
  res.status(204).end();
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

export default router;