import { Router } from "express";
import { Request, Response } from "express";
import { User } from "../models";
import bcrypt from "bcryptjs";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import multer from "multer";
import {
  parseUserFile,
  validateUserRows,
  bulkCreateUsers,
  parseParentChildFile,
  bulkLinkParentChild
} from "../services/bulkImportService";
import logger from "../utils/logger";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// Regex özel karakterlerini escape et (ReDoS/injection koruması)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get all users (with optional role filter) - requires admin/teacher
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const filter: any = {};
    if (role) {
      filter.rol = role;
    }

    // Select all fields except sensitive ones
    // Select all fields except sensitive ones
    const users = await User.find(filter).select('-sifre -tckn');
    res.json(users);
  } catch (error) {
    logger.error('Error getting users', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users by role - plural RESTful alias - requires admin/teacher
router.get("/role/:role", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { search } = req.query;
    const filter: any = { rol: role };

    if (search) {
      const safeSearch = escapeRegex(String(search));
      filter.$or = [
        { adSoyad: { $regex: safeSearch, $options: 'i' } },
        { id: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter).select('-sifre -tckn');

    res.json({
      data: users,
      pagination: {
        page: 1,
        limit: 10,
        total,
        totalPages: Math.ceil(total / 10)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Parent-child link - requires authentication (admin veya kendi hesabı)
router.post("/parent-child-link", authenticateJWT, async (req, res) => {
  const { parentId, childId } = req.body;
  const authUser = (req as any).user;

  // Yetki kontrolü: Admin veya parentId kendisi olmalı
  if (authUser?.role !== 'admin' && authUser?.userId !== parentId) {
    return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
  }

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
  if (!parent.childId) parent.childId = [];
  if (!parent.childId.includes(childId)) {
    parent.childId.push(childId);
    await parent.save();
  }
  // Also update the student's parentId for bidirectional link
  if (child.parentId !== parentId) {
    child.parentId = parentId;
    await child.save();
  }
  res.json({ success: true });
});

// Get parent's children - requires authentication
router.get("/parent/:parentId/children", authenticateJWT, async (req, res) => {
  const { parentId } = req.params;
  const parent = await User.findOne({ id: parentId });
  if (!parent) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  const children = await User.find({ id: { $in: parent.childId || [] } }).select('-sifre');
  res.json(children);
});

// Şifre değiştirme endpoint'i kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

// Bulk import users - admin only
router.post("/bulk-import", authenticateJWT, authorizeRoles(['admin']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const rows = parseUserFile(req.file.buffer, req.file.originalname);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Dosyada kullanıcı verisi bulunamadı' });
    }

    const validation = validateUserRows(rows);

    // Preview mode - return parsed data without importing
    if (req.query.preview === 'true') {
      return res.json({
        preview: true,
        total: rows.length,
        valid: validation.valid.length,
        errors: validation.errors,
        duplicates: validation.duplicates,
        rows: validation.valid.map(r => ({
          id: r.id,
          adSoyad: r.adSoyad,
          rol: r.rol,
          sinif: r.sinif,
          sube: r.sube,
        })),
      });
    }

    if (validation.valid.length === 0) {
      return res.status(400).json({
        error: 'Geçerli kullanıcı bulunamadı',
        validationErrors: validation.errors,
        duplicates: validation.duplicates,
      });
    }

    const result = await bulkCreateUsers(validation.valid);

    res.json({
      imported: result.imported,
      failed: result.failed,
      duplicates: [...validation.duplicates, ...result.duplicates],
      validationErrors: validation.errors,
      importErrors: result.errors,
    });
  } catch (error) {
    logger.error('Bulk import error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Toplu kullanıcı aktarımı sırasında hata oluştu' });
  }
});

// Bulk parent-child link - admin only
router.post("/bulk-parent-child-link", authenticateJWT, authorizeRoles(['admin']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const links = parseParentChildFile(req.file.buffer, req.file.originalname);
    if (links.length === 0) {
      return res.status(400).json({ error: 'Dosyada eşleştirme verisi bulunamadı' });
    }

    // Preview mode
    if (req.query.preview === 'true') {
      return res.json({
        preview: true,
        total: links.length,
        links: links.slice(0, 100), // Show first 100 for preview
      });
    }

    const result = await bulkLinkParentChild(links);

    res.json({
      linked: result.linked,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Bulk parent-child link error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Toplu eşleştirme sırasında hata oluştu' });
  }
});

// Update user - RESTful alias
router.put("/:userId", authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const authUser = (req as any).user;

  // GÜVENLİK: Kullanıcı sadece kendini güncelleyebilir, admin herkesi güncelleyebilir
  if (authUser?.userId !== userId && authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const updateData = req.body;

  // Hassas alanların güncellenmesini engelle (admin hariç)
  if (authUser?.role !== 'admin') {
    delete updateData.rol;
    delete updateData.isActive;
    delete updateData.sifre;
    delete updateData.tckn;
  }

  try {
    const user = await User.findOneAndUpdate({ id: userId }, updateData, { new: true, runValidators: true }).select('-sifre -tckn');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

// Update user - legacy action suffix
router.put("/:userId/update", authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const authUser = (req as any).user;

  // GÜVENLİK: Kullanıcı sadece kendini güncelleyebilir, admin herkesi güncelleyebilir
  if (authUser?.userId !== userId && authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const updateData = req.body;

  // Remove sensitive fields
  delete updateData.sifre;
  delete updateData.id;
  delete updateData.rol;
  delete updateData.tckn;
  delete updateData.createdAt;
  delete updateData.updatedAt;
  delete updateData.emailVerified;
  delete updateData.emailVerificationCode;
  delete updateData.emailVerificationExpiry;

  // If email is being changed, reset verification and disable 2FA (#18)
  if (updateData.email) {
    const currentUser = await User.findOne({ id: userId }).select('email').lean() as any;
    if (currentUser && currentUser.email !== updateData.email) {
      updateData.emailVerified = false;
      updateData.emailVerificationCode = null;
      updateData.emailVerificationExpiry = null;
      // #18: Disable 2FA when email changes (email is the 2FA delivery channel)
      updateData.twoFactorEnabled = false;
      updateData.trustedDevices = [];
    }
  }

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
    logger.error('User update error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user - RESTful alias
router.post("/", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  const { id, adSoyad, sifre, rol, sinif, sube, email } = req.body;
  if (!id || !adSoyad || !rol || !sifre) {
    return res.status(400).json({ error: "Validation failed" });
  }

  // Prevent NoSQL injection via object payloads in string fields
  if (typeof id !== 'string' || typeof adSoyad !== 'string' || typeof rol !== 'string' || typeof sifre !== 'string' || (email && typeof email !== 'string')) {
    return res.status(400).json({ error: "Invalid input types" });
  }
  const existingUser = await User.findOne({ id });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists (duplicate)" });
  }
  const hashedPassword = await bcrypt.hash(sifre, 10);
  const user = new User({ id, adSoyad, sifre: hashedPassword, rol, sinif, sube, email, isActive: true });
  await user.save();
  res.status(201).json(user);
});

// Create user - legacy action suffix
router.post("/create", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
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

  // Only bcrypt hashed passwords allowed - TCKN plaintext removed for security
  if (!sifre) {
    res.status(400).json({ error: "Şifre gereklidir" });
    return;
  }

  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(sifre, 10);

  const user = new User({
    id,
    adSoyad,
    sifre: hashedPassword,
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

// Delete user (admin) - requires admin authentication
router.delete("/:userId", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  const { userId } = req.params;
  await User.deleteOne({ id: userId });
  res.status(204).end();
});

// Get current user info (different from /api/auth/me) - requires authentication
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findOne({ id: userId }).select('-sifre -tckn');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user info', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID - requires authentication, users can only view themselves (admin/teacher can view anyone)
router.get("/:userId", authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;

    // Sadece kendi bilgilerini veya admin/teacher tüm kullanıcıları görebilir
    if (authUser?.userId !== userId && authUser?.role !== 'admin' && authUser?.role !== 'teacher') {
      return res.status(403).json({ error: 'Bu kullanıcıyı görme yetkiniz yok' });
    }

    const user = await User.findOne({ id: userId }).select('-sifre -tckn');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Error getting user', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;