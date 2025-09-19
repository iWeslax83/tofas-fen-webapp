import { Request, Response, NextFunction } from 'express';
import { body, validationResult, param, query } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

// Enhanced validation result handler with security logging
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation errors for security monitoring
    console.warn('🚫 Validation failed:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id || 'anonymous',
      errors: errors.array()
    });

    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array(),
      message: 'Please check your input and try again'
    });
  }
  next();
};

// Enhanced input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      error: 'Invalid input detected',
      message: 'Input contains potentially dangerous content'
    });
  }
};

// Recursively sanitize objects and arrays
const sanitizeObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'meta'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onkeydown', 'onkeyup', 'onkeypress']
    });
  }

  return obj;
};

// Enhanced Homework validation rules with security
export const validateHomework = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Başlık 3-200 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.,!?()]+$/)
    .withMessage('Başlık sadece harf, rakam ve temel noktalama işaretleri içerebilir'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Açıklama 10-2000 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'] })),
  
  body('subject')
    .trim()
    .isIn([
      'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce',
      'Türkçe', 'Tarih', 'Coğrafya', 'Din Kültürü', 'Beden Eğitimi',
      'Müzik', 'Görsel Sanatlar', 'Teknoloji ve Tasarım', 'Bilişim Teknolojileri'
    ])
    .withMessage('Geçersiz ders adı'),
  
  body('classLevel')
    .trim()
    .isIn(['9', '10', '11', '12'])
    .withMessage('Geçersiz sınıf seviyesi'),
  
  body('classSection')
    .optional()
    .trim()
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('Geçersiz şube'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Geçersiz tarih formatı')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      if (dueDate <= now) {
        throw new Error('Bitiş tarihi gelecekte olmalıdır');
      }
      return true;
    }),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Geçersiz öncelik seviyesi'),
  
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('En fazla 5 dosya eklenebilir'),
  
  body('attachments.*.filename')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Dosya adı 1-255 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.]+$/)
    .withMessage('Dosya adı sadece harf, rakam ve temel karakterler içerebilir'),
  
  body('attachments.*.size')
    .optional()
    .isInt({ min: 1, max: 10 * 1024 * 1024 }) // 10MB max
    .withMessage('Dosya boyutu 1 byte - 10MB arasında olmalıdır'),
  
  validateRequest
];

// Enhanced User validation rules with comprehensive security
export const validateUser = [
  body('id')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Kullanıcı ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Kullanıcı ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('adSoyad')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ad soyad 2-100 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Ad soyad sadece harf ve boşluk içerebilir'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçersiz email adresi')
    .custom((value) => {
      // Check for disposable email domains
      const disposableDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
      const domain = value.split('@')[1];
      if (disposableDomains.includes(domain)) {
        throw new Error('Geçici email adresleri kabul edilmez');
      }
      return true;
    }),
  
  body('rol')
    .isIn(['student', 'teacher', 'parent', 'admin', 'hizmetli'])
    .withMessage('Geçersiz rol'),
  
  body('sinif')
    .optional()
    .trim()
    .isIn(['9', '10', '11', '12'])
    .withMessage('Geçersiz sınıf'),
  
  body('sube')
    .optional()
    .trim()
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('Geçersiz şube'),
  
  body('oda')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Oda numarası 1-10 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z\d\-_]+$/)
    .withMessage('Oda numarası sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('pansiyon')
    .optional()
    .isBoolean()
    .withMessage('Pansiyon değeri boolean olmalıdır'),
  
  body('parentId')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Veli ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Veli ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('childId')
    .optional()
    .isArray()
    .withMessage('Çocuk ID listesi array olmalıdır'),
  
  body('childId.*')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Çocuk ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Çocuk ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  validateRequest
];

// Enhanced Note validation rules
export const validateNote = [
  body('studentId')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Öğrenci ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Öğrenci ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('lesson')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ders adı 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Ders adı sadece harf ve boşluk içerebilir'),
  
  body('note')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Not 0-100 arasında olmalıdır'),
  
  body('date')
    .isISO8601()
    .withMessage('Geçersiz tarih formatı')
    .custom((value) => {
      const noteDate = new Date(value);
      const now = new Date();
      if (noteDate > now) {
        throw new Error('Not tarihi gelecekte olamaz');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 0, max: 500 })
    .withMessage('Açıklama en fazla 500 karakter olabilir')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  body('semester')
    .optional()
    .isIn(['1', '2'])
    .withMessage('Geçersiz dönem'),
  
  body('academicYear')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Geçersiz akademik yıl'),
  
  validateRequest
];

// Enhanced Announcement validation rules
export const validateAnnouncement = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Başlık 5-200 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.,!?()]+$/)
    .withMessage('Başlık sadece harf, rakam ve temel noktalama işaretleri içerebilir'),
  
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('İçerik 10-5000 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { 
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['class', 'id']
    })),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Geçersiz öncelik seviyesi'),
  
  body('targetRoles')
    .optional()
    .isArray()
    .withMessage('Hedef roller array olmalıdır'),
  
  body('targetRoles.*')
    .optional()
    .isIn(['student', 'teacher', 'parent', 'admin', 'hizmetli'])
    .withMessage('Geçersiz hedef rol'),
  
  body('targetClasses')
    .optional()
    .isArray()
    .withMessage('Hedef sınıflar array olmalıdır'),
  
  body('targetClasses.*')
    .optional()
    .isIn(['9', '10', '11', '12'])
    .withMessage('Geçersiz hedef sınıf'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Geçersiz son kullanma tarihi formatı')
    .custom((value) => {
      const expiryDate = new Date(value);
      const now = new Date();
      if (expiryDate <= now) {
        throw new Error('Son kullanma tarihi gelecekte olmalıdır');
      }
      return true;
    }),
  
  validateRequest
];

// Enhanced Club validation rules
export const validateClub = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Kulüp adı 3-100 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.,!?()]+$/)
    .withMessage('Kulüp adı sadece harf, rakam ve temel noktalama işaretleri içerebilir'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Açıklama 10-1000 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { 
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    })),
  
  body('category')
    .trim()
    .isIn(['academic', 'sports', 'arts', 'technology', 'social', 'other'])
    .withMessage('Geçersiz kategori'),
  
  body('maxMembers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maksimum üye sayısı 1-1000 arasında olmalıdır'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('Genel erişim değeri boolean olmalıdır'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('En fazla 10 etiket eklenebilir'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Etiket 1-20 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Etiket sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  validateRequest
];

// Enhanced Meal List validation rules
export const validateMealList = [
  body('date')
    .isISO8601()
    .withMessage('Geçersiz tarih formatı'),
  
  body('meals')
    .isArray({ min: 1, max: 5 })
    .withMessage('En az 1, en fazla 5 öğün olmalıdır'),
  
  body('meals.*.type')
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Geçersiz öğün türü'),
  
  body('meals.*.time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Geçersiz saat formatı (HH:MM)'),
  
  body('meals.*.menu')
    .isArray({ min: 1, max: 20 })
    .withMessage('Menü 1-20 öğe içermelidir'),
  
  body('meals.*.menu.*')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Menü öğesi 1-100 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ min: 0, max: 500 })
    .withMessage('Notlar en fazla 500 karakter olabilir')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  validateRequest
];

// Enhanced Supervisor List validation rules
export const validateSupervisorList = [
  body('date')
    .isISO8601()
    .withMessage('Geçersiz tarih formatı'),
  
  body('supervisors')
    .isArray({ min: 1 })
    .withMessage('En az 1 belletmen olmalıdır'),
  
  body('supervisors.*.userId')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Kullanıcı ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Kullanıcı ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('supervisors.*.shift')
    .isIn(['morning', 'afternoon', 'evening', 'night'])
    .withMessage('Geçersiz vardiya'),
  
  body('supervisors.*.area')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Alan 1-50 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  body('supervisors.*.startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Geçersiz başlangıç saati formatı (HH:MM)'),
  
  body('supervisors.*.endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Geçersiz bitiş saati formatı (HH:MM)')
    .custom((value, { req }) => {
      const startTime = req.body.startTime;
      if (value <= startTime) {
        throw new Error('Bitiş saati başlangıç saatinden sonra olmalıdır');
      }
      return true;
    }),
  
  validateRequest
];

// Enhanced Maintenance Request validation rules
export const validateMaintenanceRequest = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Başlık 5-200 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.,!?()]+$/)
    .withMessage('Başlık sadece harf, rakam ve temel noktalama işaretleri içerebilir'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Açıklama 10-1000 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'] })),
  
  body('category')
    .isIn(['electrical', 'plumbing', 'heating', 'structural', 'cleaning', 'other'])
    .withMessage('Geçersiz kategori'),
  
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Geçersiz öncelik seviyesi'),
  
  body('location')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Konum 3-100 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  body('estimatedCost')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Tahmini maliyet 0-1,000,000 arasında olmalıdır'),
  
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('En fazla 10 dosya eklenebilir'),
  
  body('attachments.*.filename')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Dosya adı 1-255 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.]+$/)
    .withMessage('Dosya adı sadece harf, rakam ve temel karakterler içerebilir'),
  
  validateRequest
];

// Enhanced Evci Request validation rules
export const validateEvciRequest = [
  body('studentId')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Öğrenci ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('Öğrenci ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Gerekçe 10-500 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em'] })),
  
  body('startDate')
    .isISO8601()
    .withMessage('Geçersiz başlangıç tarihi formatı')
    .custom((value) => {
      const startDate = new Date(value);
      const now = new Date();
      if (startDate < now) {
        throw new Error('Başlangıç tarihi geçmişte olamaz');
      }
      return true;
    }),
  
  body('endDate')
    .isISO8601()
    .withMessage('Geçersiz bitiş tarihi formatı')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }
      return true;
    }),
  
  body('destination')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Gidilecek yer 3-100 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  body('contactPhone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/)
    .withMessage('Geçersiz telefon numarası formatı'),
  
  body('emergencyContact')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Acil durum iletişim 3-100 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  validateRequest
];

// Enhanced Request Data validation rules
export const validateRequestData = [
  body('type')
    .isIn(['general', 'maintenance', 'evci', 'other'])
    .withMessage('Geçersiz istek türü'),
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Başlık 5-200 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\-_.,!?()]+$/)
    .withMessage('Başlık sadece harf, rakam ve temel noktalama işaretleri içerebilir'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Açıklama 10-2000 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { 
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    })),
  
  body('priority')
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Geçersiz öncelik seviyesi'),
  
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('En fazla 5 dosya eklenebilir'),
  
  validateRequest
];

// Enhanced parameter validation
export const validateId = [
  param('id')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('ID 3-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\d\-_]+$/)
    .withMessage('ID sadece harf, rakam, tire ve alt çizgi içerebilir'),
  
  validateRequest
];

// Enhanced query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Sayfa numarası 1-1000 arasında olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Sayfa boyutu 1-100 arasında olmalıdır'),
  
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sıralama sadece asc veya desc olabilir'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
    .customSanitizer(value => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })),
  
  validateRequest
];

// All validation rules are already exported individually above