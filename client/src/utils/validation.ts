import * as yup from 'yup';

// Individual validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
  return phoneRegex.test(phone);
};

export const validateSchoolId = (id: string): boolean => {
  // School ID validation: 6-8 digits, alphanumeric allowed
  const schoolIdRegex = /^[A-Za-z0-9]{6,8}$/;
  return schoolIdRegex.test(id);
};

export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

// User validation schemas
export const userProfileSchema = yup.object({
  adSoyad: yup.string()
    .required('Ad soyad zorunludur')
    .min(2, 'Ad soyad en az 2 karakter olmalıdır')
    .max(100, 'Ad soyad en fazla 100 karakter olabilir'),
  email: yup.string()
    .email('Geçerli bir e-posta adresi giriniz')
    .required('E-posta adresi zorunludur'),
  telefon: yup.string()
    .matches(/^(\+90|0)?[0-9]{10}$/, 'Geçerli bir telefon numarası giriniz')
    .optional(),
  adres: yup.string()
    .max(500, 'Adres en fazla 500 karakter olabilir')
    .optional(),
  dogumTarihi: yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Doğum tarihi YYYY-MM-DD formatında olmalıdır')
    .test('is-valid-date', 'Geçerli bir tarih giriniz', function(value) {
      if (!value) return true; // Optional field
      const date = new Date(value);
      return !isNaN(date.getTime()) && date <= new Date();
    })
    .optional(),
  cinsiyet: yup.string()
    .oneOf(['erkek', 'kadın'], 'Geçerli bir cinsiyet seçiniz')
    .optional(),
  meslek: yup.string()
    .max(100, 'Meslek en fazla 100 karakter olabilir')
    .optional(),
  departman: yup.string()
    .max(100, 'Departman en fazla 100 karakter olabilir')
    .optional(),
});

export const passwordChangeSchema = yup.object({
  currentPassword: yup.string()
    .required('Mevcut şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
  newPassword: yup.string()
    .required('Yeni şifre zorunludur')
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  confirmPassword: yup.string()
    .required('Şifre tekrarı zorunludur')
    .oneOf([yup.ref('newPassword')], 'Şifreler eşleşmiyor'),
});

// Request validation schemas
export const classChangeRequestSchema = yup.object({
  sinif: yup.string()
    .required('Sınıf seçimi zorunludur')
    .matches(/^[0-9]+$/, 'Sınıf sadece rakam olmalıdır'),
  sube: yup.string()
    .required('Şube seçimi zorunludur')
    .matches(/^[A-Z]$/, 'Şube tek bir büyük harf olmalıdır'),
  reason: yup.string()
    .required('Gerekçe zorunludur')
    .min(10, 'Gerekçe en az 10 karakter olmalıdır')
    .max(500, 'Gerekçe en fazla 500 karakter olabilir'),
});

export const roomChangeRequestSchema = yup.object({
  oda: yup.string()
    .required('Oda seçimi zorunludur')
    .matches(/^[0-9]+$/, 'Oda numarası sadece rakam olmalıdır'),
  reason: yup.string()
    .required('Gerekçe zorunludur')
    .min(10, 'Gerekçe en az 10 karakter olmalıdır')
    .max(500, 'Gerekçe en fazla 500 karakter olabilir'),
});

// Note validation schemas
export const noteSchema = yup.object({
  studentId: yup.string()
    .required('Öğrenci seçimi zorunludur'),
  subject: yup.string()
    .required('Ders seçimi zorunludur')
    .max(100, 'Ders adı en fazla 100 karakter olabilir'),
  grade: yup.number()
    .required('Not zorunludur')
    .min(0, 'Not 0\'dan küçük olamaz')
    .max(100, 'Not 100\'den büyük olamaz'),
  examType: yup.string()
    .required('Sınav türü zorunludur')
    .oneOf(['midterm', 'final', 'quiz', 'homework'], 'Geçerli bir sınav türü seçiniz'),
  semester: yup.string()
    .required('Dönem seçimi zorunludur')
    .oneOf(['1', '2'], 'Geçerli bir dönem seçiniz'),
  academicYear: yup.string()
    .required('Akademik yıl zorunludur')
    .matches(/^[0-9]{4}-[0-9]{4}$/, 'Akademik yıl formatı: 2024-2025'),
});

// Homework validation schemas
export const homeworkSchema = yup.object({
  title: yup.string()
    .required('Başlık zorunludur')
    .min(5, 'Başlık en az 5 karakter olmalıdır')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  description: yup.string()
    .required('Açıklama zorunludur')
    .min(10, 'Açıklama en az 10 karakter olmalıdır')
    .max(1000, 'Açıklama en fazla 1000 karakter olabilir'),
  subject: yup.string()
    .required('Ders seçimi zorunludur'),
  dueDate: yup.date()
    .min(new Date(), 'Teslim tarihi geçmişte olamaz')
    .required('Teslim tarihi zorunludur'),
  assignedTo: yup.array()
    .of(yup.string())
    .min(1, 'En az bir öğrenci seçilmelidir')
    .required('Öğrenci seçimi zorunludur'),
});

// Club validation schemas
export const clubSchema = yup.object({
  name: yup.string()
    .required('Kulüp adı zorunludur')
    .min(3, 'Kulüp adı en az 3 karakter olmalıdır')
    .max(100, 'Kulüp adı en fazla 100 karakter olabilir'),
  description: yup.string()
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .optional(),
  category: yup.string()
    .required('Kategori seçimi zorunludur'),
  maxMembers: yup.number()
    .min(1, 'Maksimum üye sayısı en az 1 olmalıdır')
    .max(100, 'Maksimum üye sayısı en fazla 100 olabilir')
    .optional(),
});

// Announcement validation schemas
export const announcementSchema = yup.object({
  title: yup.string()
    .required('Başlık zorunludur')
    .min(5, 'Başlık en az 5 karakter olmalıdır')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  content: yup.string()
    .required('İçerik zorunludur')
    .min(10, 'İçerik en az 10 karakter olmalıdır')
    .max(2000, 'İçerik en fazla 2000 karakter olabilir'),
  targetRoles: yup.array()
    .of(yup.string().oneOf(['admin', 'teacher', 'student', 'parent', 'hizmetli']))
    .min(1, 'En az bir hedef rol seçilmelidir')
    .required('Hedef roller zorunludur'),
  priority: yup.string()
    .oneOf(['low', 'medium', 'high'], 'Geçerli bir öncelik seviyesi seçiniz')
    .default('medium'),
});

// Schedule validation schemas
export const scheduleSchema = yup.object({
  classLevel: yup.string()
    .required('Sınıf seviyesi zorunludur')
    .matches(/^[0-9]+$/, 'Sınıf seviyesi sadece rakam olmalıdır'),
  section: yup.string()
    .required('Şube seçimi zorunludur')
    .matches(/^[A-Z]$/, 'Şube tek bir büyük harf olmalıdır'),
  dayOfWeek: yup.number()
    .required('Gün seçimi zorunludur')
    .min(1, 'Gün 1-7 arasında olmalıdır')
    .max(7, 'Gün 1-7 arasında olmalıdır'),
  period: yup.number()
    .required('Ders saati zorunludur')
    .min(1, 'Ders saati 1-8 arasında olmalıdır')
    .max(8, 'Ders saati 1-8 arasında olmalıdır'),
  subject: yup.string()
    .required('Ders seçimi zorunludur'),
  teacherId: yup.string()
    .required('Öğretmen seçimi zorunludur'),
  room: yup.string()
    .required('Sınıf seçimi zorunludur'),
});

// Generic validation helper
export const validateForm = async <T>(
  schema: yup.ObjectSchema<any>,
  data: T
): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Validation error occurred' } };
  }
};
