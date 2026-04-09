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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
      return cb(
        new Error(
          `İzin verilmeyen dosya uzantısı: ${ext}. İzin verilenler: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`,
        ),
      );
    }

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Dosya uzantısı (${ext}) ile MIME tipi (${file.mimetype}) eşleşmiyor`));
    }

    cb(null, true);
  },
});

// Magic bytes for file validation.
// Binary formats have well-known signatures; text-based formats (csv, txt)
// have no magic bytes by design and must be validated via the multer MIME
// filter alone.
const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  '.gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  '.webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  '.doc': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
  '.docx': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  // ZIP-based (Office 2007+) formats share the same signature.
  '.xlsx': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  '.pptx': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  // Legacy Excel binary format
  '.xls': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
  // Plain zip archives
  '.zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

// Text-ish formats that legitimately have no magic bytes. Presence here means
// "skip magic-byte validation, trust the multer MIME filter."
const TEXT_EXT_NO_MAGIC = new Set(['.csv', '.txt', '.json', '.xml', '.log']);

export function validateMagicBytes(filePath: string, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false;

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    return signatures.some((sig) => buffer.subarray(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

/** Buffer-based variant for multer memoryStorage. */
export function validateMagicBytesBuffer(buffer: Buffer, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false;
  const head = buffer.subarray(0, 8);
  return signatures.some((sig) => head.subarray(0, sig.length).equals(sig));
}

/**
 * B-M6: Express middleware to verify the magic bytes of every file uploaded
 * through this request. Call it directly after `upload.single()`/`upload.array()`
 * so any spoofed MIME type is rejected before the handler runs.
 *
 * On failure, every uploaded file is unlinked and a 400 is returned.
 */
export function verifyUploadedFiles(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const multerReq = req as express.Request & {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
  };

  const files: Express.Multer.File[] = [];
  if (multerReq.file) files.push(multerReq.file);
  if (Array.isArray(multerReq.files)) {
    files.push(...multerReq.files);
  } else if (multerReq.files && typeof multerReq.files === 'object') {
    for (const arr of Object.values(multerReq.files)) {
      files.push(...arr);
    }
  }

  if (files.length === 0) {
    return next();
  }

  const rejected: string[] = [];
  for (const f of files) {
    const ext = path.extname(f.originalname).toLowerCase();
    // Text-based formats have no magic bytes; trust the multer MIME filter.
    if (TEXT_EXT_NO_MAGIC.has(ext)) continue;
    // Works for both disk storage (f.path) and memory storage (f.buffer).
    const ok = f.buffer ? validateMagicBytesBuffer(f.buffer, ext) : validateMagicBytes(f.path, ext);
    if (!ok) rejected.push(f.originalname);
  }

  if (rejected.length > 0) {
    // Delete ALL uploaded files for this request (atomic reject).
    for (const f of files) {
      if (f.path) {
        try {
          fs.unlinkSync(f.path);
        } catch {
          /* best effort */
        }
      }
    }
    res.status(400).json({
      error: 'Dosya içeriği uzantı ile uyuşmuyor. Yükleme reddedildi.',
      rejected,
    });
    return;
  }

  next();
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
        return res
          .status(400)
          .json({ error: 'Dosya içeriği, dosya uzantısı ile uyuşmuyor. Dosya reddedildi.' });
      }

      const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${file.filename}`;
      res.json({ url: fileUrl, filename: file.filename });
    } catch (error) {
      logger.error('File upload error', { error });
      res.status(500).json({ error: 'Dosya yüklenemedi' });
    }
  });
}
