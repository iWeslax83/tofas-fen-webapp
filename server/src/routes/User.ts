import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import multer from 'multer';
import { verifyUploadedFiles } from '../config/upload';
import logger from '../utils/logger';
import {
  listUsers,
  listUsersByRole,
  listUsersPaginated,
  getUserById,
  getUserByIdForView,
  createUser,
  createUserLegacy,
  updateUser,
  updateUserLegacy,
  getUserEmailById,
  deleteUser,
  linkParentChild,
  getChildrenForParent,
  bulkLinkParentChildFromFile,
} from '../services/UserService';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with optional role filter
 *     description: Returns all users excluding sensitive fields (password, TCKN). Requires admin or teacher role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string

 *         description: Filter users by role
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin or teacher role
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.query;
      const users = await listUsers({ role: role ? String(role) : undefined });
      res.json(users);
    } catch (error) {
      logger.error('Error getting users', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * @swagger
 * /api/users/list:
 *   get:
 *     summary: Get paginated users across all roles, with optional role and search filters
 *     description: Returns paginated users, optionally filtered by role and a name/ID search term. Backs the admin Senkronizasyon table so it doesn't have to render every user at once. Requires admin or teacher role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Optional role filter; omit to include every role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter by name or ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       400:
 *         description: Search term invalid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin or teacher role
 *       500:
 *         description: Internal server error
 */
router.get(
  '/list',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const { role, search } = req.query;
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);

      const result = await listUsersPaginated({
        role: role ? String(role) : undefined,
        search: search ? String(search) : undefined,
        page,
        limit,
      });

      if (result.badSearch) {
        return res.status(400).json({ error: 'Arama terimi çok uzun (en fazla 100 karakter)' });
      }

      // Named "users", not "data" — the client's generic response unwrapper
      // treats a top-level "data" key as an envelope and strips everything
      // else (including "pagination") when unwrapping it.
      res.json({ users: result.data, pagination: result.pagination });
    } catch (error) {
      logger.error('Error listing paginated users', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * @swagger
 * /api/users/role/{role}:
 *   get:
 *     summary: Get users by role with optional search
 *     description: Returns paginated users filtered by role. Supports text search on name and ID. Requires admin or teacher role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string

 *         description: User role to filter by
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter by name or ID
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin or teacher role
 *       500:
 *         description: Internal server error
 */
router.get(
  '/role/:role',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.params;
      const { search } = req.query;
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);

      const result = await listUsersByRole({
        role,
        search: search ? String(search) : undefined,
        page,
        limit,
      });

      if (result.badSearch) {
        return res.status(400).json({ error: 'Arama terimi çok uzun (en fazla 100 karakter)' });
      }

      res.json({
        data: result.data,
        pagination: result.pagination,
      });
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  },
);

/**
 * @swagger
 * /api/users/parent-child-link:
 *   post:
 *     summary: Link a parent to a child (student)
 *     description: Creates a bidirectional parent-child relationship. Admin can link any pair; parents can only link themselves.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parentId
 *               - childId
 *             properties:
 *               parentId:
 *                 type: string
 *                 description: ID of the parent user
 *               childId:
 *                 type: string
 *                 description: ID of the student user
 *     responses:
 *       200:
 *         description: Link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid roles (parent must be parent role, child must be student role)
 *       403:
 *         description: Forbidden - not admin and not the parent
 *       404:
 *         description: User not found
 */
router.post('/parent-child-link', authenticateJWT, async (req, res) => {
  const { parentId, childId } = req.body;
  const authUser = (req as unknown as { user?: { userId?: string; role?: string } }).user;

  // Yetki kontrolü: Admin veya parentId kendisi olmalı
  if (authUser?.role !== 'admin' && authUser?.userId !== parentId) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const result = await linkParentChild({ parentId, childId });
  if (result.notFound) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  if (result.invalidRole) {
    res.status(400).json({ error: 'Geçersiz rol' });
    return;
  }
  res.json({ success: true });
});

/**
 * @swagger
 * /api/users/parent/{parentId}/children:
 *   get:
 *     summary: Get a parent's children
 *     description: Returns the list of student users linked to the given parent.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent user ID
 *     responses:
 *       200:
 *         description: List of child (student) users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: Parent not found
 */
router.get('/parent/:parentId/children', authenticateJWT, async (req, res) => {
  const { parentId } = req.params;
  const authUser = (req as unknown as { user?: { userId?: string; role?: string } }).user;

  const allowedRoles = ['admin', 'teacher'];
  if (!allowedRoles.includes(authUser.role) && authUser.userId !== parentId) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const result = await getChildrenForParent(parentId);
  if (result.notFound) {
    res.status(404).json({ error: 'Parent not found' });
    return;
  }
  res.json(result.children);
});

// Şifre değiştirme endpoint'i kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

/**
 * @swagger
 * /api/users/bulk-parent-child-link:
 *   post:
 *     summary: Bulk link parents to children from file
 *     description: Upload an Excel/CSV file to link parent-child relationships in bulk. Supports preview mode. Admin only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preview
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: If 'true', returns parsed data without linking
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel or CSV file (max 5MB)
 *     responses:
 *       200:
 *         description: Link result or preview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 linked:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: No file uploaded or no link data found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Internal server error
 */
router.post(
  '/bulk-parent-child-link',
  authenticateJWT,
  authorizeRoles(['admin']),
  upload.single('file'),
  verifyUploadedFiles,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenmedi' });
      }

      const result = await bulkLinkParentChildFromFile({
        fileBuffer: req.file.buffer,
        originalname: req.file.originalname,
        preview: req.query.preview === 'true',
      });

      if (result.noData) {
        return res.status(400).json({ error: 'Dosyada eşleştirme verisi bulunamadı' });
      }

      if (result.preview) {
        return res.json({
          preview: true,
          total: result.total,
          links: result.links,
        });
      }

      res.json({
        linked: result.linked,
        errors: result.errors,
      });
    } catch (error) {
      logger.error('Bulk parent-child link error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Toplu eşleştirme sırasında hata oluştu' });
    }
  },
);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Update a user
 *     description: Users can update themselves; admins can update anyone. Sensitive fields (role, isActive, password, TCKN) are stripped for non-admins.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adSoyad:
 *                 type: string
 *               email:
 *                 type: string
 *               sinif:
 *                 type: string
 *               sube:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update own profile unless admin
 *       404:
 *         description: User not found
 */
router.put('/:userId', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const authUser = (req as unknown as { user?: { userId?: string; role?: string } }).user;

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

  const result = await updateUser({ userId, updateData });
  if (result.notFound) return res.status(404).json({ error: 'User not found' });
  if (result.updateFailed) return res.status(400).json({ error: 'Update failed' });
  res.json(result.user);
});

/**
 * @swagger
 * /api/users/{userId}/update:
 *   put:
 *     summary: Update a user (legacy endpoint)
 *     description: Legacy endpoint for user updates. Strips sensitive fields. If email changes, resets email verification and disables 2FA.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adSoyad:
 *                 type: string
 *               email:
 *                 type: string
 *               sinif:
 *                 type: string
 *               sube:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user with success flag
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update own profile unless admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/update', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const authUser = (req as unknown as { user?: { userId?: string; role?: string } }).user;

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
    const currentEmail = await getUserEmailById(userId);
    if (currentEmail !== null && currentEmail !== updateData.email) {
      updateData.emailVerified = false;
      updateData.emailVerificationCode = null;
      updateData.emailVerificationExpiry = null;
      // #18: Disable 2FA when email changes (email is the 2FA delivery channel)
      updateData.twoFactorEnabled = false;
      updateData.trustedDevices = [];
    }
  }

  try {
    const result = await updateUserLegacy({ userId, updateData });
    if (result.notFound) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.user });
  } catch (error) {
    logger.error('User update error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Admin-only endpoint to create a new user. Password is bcrypt-hashed before storage.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - adSoyad
 *               - sifre
 *               - rol
 *             properties:
 *               id:
 *                 type: string
 *               adSoyad:
 *                 type: string
 *               sifre:
 *                 type: string
 *                 description: Plain text password (will be hashed)
 *               rol:
 *                 type: string

 *               sinif:
 *                 type: string
 *               sube:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation failed or user already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.post('/', authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  const { id, adSoyad, sifre, rol, sinif, sube, email } = req.body;

  const result = await createUser({ id, adSoyad, sifre, rol, sinif, sube, email });

  if (result.validationError) {
    return res.status(400).json({ error: 'Validation failed' });
  }
  if (result.typeError) {
    return res.status(400).json({ error: 'Invalid input types' });
  }
  if (result.duplicate) {
    return res.status(400).json({ error: 'User already exists (duplicate)' });
  }
  res.status(201).json(result.user);
});

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create a new user (legacy endpoint)
 *     description: Legacy admin-only endpoint to create a user with additional fields like oda and pansiyon.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - adSoyad
 *               - sifre
 *               - rol
 *             properties:
 *               id:
 *                 type: string
 *               adSoyad:
 *                 type: string
 *               tckn:
 *                 type: string
 *               sifre:
 *                 type: string
 *                 description: Plain text password (will be hashed)
 *               rol:
 *                 type: string

 *               sinif:
 *                 type: string
 *               sube:
 *                 type: string
 *               oda:
 *                 type: string
 *               pansiyon:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Required fields missing or user already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.post('/create', authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  const { id, adSoyad, tckn, sifre, rol, sinif, sube, oda, pansiyon, email } = req.body;

  const result = await createUserLegacy({
    id,
    adSoyad,
    tckn,
    sifre,
    rol,
    sinif,
    sube,
    oda,
    pansiyon,
    email,
  });

  if (result.missingFields) {
    res.status(400).json({ error: 'Gerekli alanlar eksik' });
    return;
  }
  if (result.duplicate) {
    res.status(400).json({ error: 'Kullanıcı zaten mevcut' });
    return;
  }
  if (result.missingPassword) {
    res.status(400).json({ error: 'Şifre gereklidir' });
    return;
  }
  res.status(201).json({ success: true });
});

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     description: Permanently deletes a user. Admin only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.delete('/:userId', authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  const { userId } = req.params;
  await deleteUser(userId);
  res.status(204).end();
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user info
 *     description: Returns the profile of the currently authenticated user, excluding password and TCKN.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized or user not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as unknown as { user?: { userId?: string; role?: string } }).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user info', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Returns a user profile. Users can only view themselves; admins and teachers can view anyone.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile (excludes password and TCKN)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot view other users unless admin/teacher
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    const authUser = (req as unknown as { user?: { userId?: string; role?: string } }).user;

    // Sadece kendi bilgilerini veya admin/teacher tüm kullanıcıları görebilir
    if (authUser?.userId !== userId && authUser?.role !== 'admin' && authUser?.role !== 'teacher') {
      return res.status(403).json({ error: 'Bu kullanıcıyı görme yetkiniz yok' });
    }

    const user = await getUserByIdForView(userId);
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
