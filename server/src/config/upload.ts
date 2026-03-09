import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import logger from '../utils/logger';

/**
 * File upload configuration - extracted from index.ts.
 */

// Uploads directory
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = path.basename(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(safeOriginalName));
  },
});

// Allowed file types whitelist
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ALLOWED_FILE_TYPES[ext];

    if (!allowedMimes) {
      return cb(new Error(`İzin verilmeyen dosya uzantısı: ${ext}. İzin verilenler: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`));
    }

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Dosya uzantısı (${ext}) ile MIME tipi (${file.mimetype}) eşleşmiyor`));
    }

    cb(null, true);
  },
});

// Magic bytes for file validation
const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  '.gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  '.webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  '.doc': [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])],
  '.docx': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
};

export function validateMagicBytes(filePath: string, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false;

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

/**
 * Setup upload routes on the Express app.
 */
export function setupUploadRoutes(app: express.Express): void {
  // Static file serving
  app.use('/uploads', express.static(uploadsDir));

  // File upload endpoint
  app.post('/api/upload', upload.single('file'), (req: express.Request, res: express.Response) => {
    try {
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      if (!file) {
        return res.status(400).json({ error: 'Dosya yüklenmedi' });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!validateMagicBytes(file.path, ext)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Dosya içeriği, dosya uzantısı ile uyuşmuyor. Dosya reddedildi.' });
      }

      const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${file.filename}`;
      res.json({ url: fileUrl, filename: file.filename });
    } catch (error) {
      logger.error('File upload error', { error });
      res.status(500).json({ error: 'Dosya yüklenemedi' });
    }
  });
}
