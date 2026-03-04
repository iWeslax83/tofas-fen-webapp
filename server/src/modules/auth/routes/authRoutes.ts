import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateJWT, authorizeRoles } from '../../../utils/jwt';
import { authLimiter } from '../../../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Kimlik doğrulama işlemleri
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             id: "2024001"
 *             sifre: "password123"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         description: Çok fazla giriş denemesi
 */
router.post('/login', authLimiter, AuthController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, adSoyad, rol, sifre]
 *             properties:
 *               id:
 *                 type: string
 *               adSoyad:
 *                 type: string
 *               rol:
 *                 type: string
 *               sifre:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Kullanıcı zaten var
 */
// #21: Register requires admin authentication
router.post('/register', authenticateJWT, authorizeRoles(['admin']), AuthController.register);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Token yenileme
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token başarıyla yenilendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh-token', authLimiter, AuthController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Kullanıcı çıkışı
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', authenticateJWT, AuthController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profili
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/profile', authenticateJWT, AuthController.getProfile);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Kullanıcı bilgileri (legacy endpoint)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 adSoyad:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 email:
 *                   type: string
 *                 sinif:
 *                   type: string
 *                 sube:
 *                   type: string
 *                 oda:
 *                   type: string
 *                 pansiyon:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/me', authenticateJWT, AuthController.getMe);

/**
 * @swagger
 * /api/auth/send-verification:
 *   post:
 *     summary: E-posta doğrulama kodu gönder
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doğrulama kodu gönderildi
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// #22: Rate limit on send-verification
router.post('/send-verification', authenticateJWT, authLimiter, AuthController.sendVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta doğrulama kodunu onayla
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-posta doğrulandı
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/verify-email', authenticateJWT, AuthController.verifyEmail);

// 2FA routes
router.post('/verify-2fa', authLimiter, AuthController.verifyTwoFactor);
// #13: Resend 2FA code route
router.post('/resend-2fa', authLimiter, AuthController.resendTwoFactor);
router.post('/toggle-2fa', authenticateJWT, AuthController.toggleTwoFactor);

export default router;
