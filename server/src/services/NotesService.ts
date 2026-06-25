import Note, { INote } from '../models/Note';
import { ExcelImportService } from './excelImportService';
import { User } from '../models';
import { getParentChildIds } from '../middleware/parentChildAccess';
import { MongoFilter } from '../types';
import logger from '../utils/logger';
import { logSecurityEvent, SecurityEvent } from '../utils/securityLogger';
import { safeSearchRegex } from '../utils/regex';

/** Shape of a note update entry in bulk-update */
export interface NoteUpdateEntry {
  id: string;
  [key: string]: unknown;
}

export interface ListNotesParams {
  role: string | undefined;
  userId: string | undefined;
  studentId?: string;
  lesson?: string;
  semester?: string;
  academicYear?: string;
  source?: string;
  gradeLevel?: string;
  classSection?: string;
  page: number;
  limit: number;
}

export interface ListNotesResult {
  /** undefined means caller should send res.json([]) immediately */
  earlyEmpty?: true;
  notes?: INote[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface StudentNotesParams {
  studentId: string;
  semester?: string;
  academicYear?: string;
}

export interface CreateNoteData {
  [key: string]: unknown;
}

export interface UpdateNoteResult {
  notFound?: true;
  forbidden?: true;
  note?: INote;
}

export interface StatsParams {
  role: string | undefined;
  userId: string | undefined;
  semester?: string;
  academicYear?: string;
  gradeLevel?: string;
  classSection?: string;
}

export interface StatsResult {
  earlyEmpty?: true;
  stats?: unknown[];
}

export interface BulkUpdateParams {
  notes: NoteUpdateEntry[];
  role: string | undefined;
  userId: string | undefined;
}

export interface BulkUpdateResult {
  updated: number;
  notes: (INote | null)[];
}

export interface ImportExcelParams {
  fileBuffer: Buffer;
  originalname: string;
  semester: string;
  academicYear: string;
  source?: string;
  role: string | undefined;
  userId: string | undefined;
  ip: string | undefined;
  userAgent: string | undefined;
}

export interface ImportExcelResult {
  /** validation errors from the file */
  fileErrors?: string[];
  /** invalid student IDs */
  invalidIds?: string[];
  /** teacher auth rejection */
  teacherRejection?: { reason: 'no_class' | 'unauthorized_students'; unauthorizedCount?: number };
  imported?: number;
  errors?: string[];
}

export interface SearchParams {
  q: string;
  role: string | undefined;
  userId: string | undefined;
  semester?: string;
  academicYear?: string;
}

export interface SearchResult {
  invalidQuery?: true;
  earlyEmpty?: true;
  notes?: INote[];
}

export interface BackupParams {
  semester: string;
  academicYear: string;
}

export interface BackupData {
  timestamp: Date;
  semester: string;
  academicYear: string;
  count: number;
  notes: INote[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────────────────────

export async function listNotes(params: ListNotesParams): Promise<ListNotesResult> {
  const {
    role,
    userId,
    studentId,
    lesson,
    semester,
    academicYear,
    source,
    gradeLevel,
    classSection,
    page,
    limit,
  } = params;

  const filter: MongoFilter<INote> = { isActive: true };

  if (role === 'student') {
    filter.studentId = userId;
  } else if (role === 'parent') {
    const childIds = await getParentChildIds(userId!);
    if (childIds.length === 0) {
      return { earlyEmpty: true };
    }
    filter.studentId = { $in: childIds };
  } else {
    if (studentId) filter.studentId = studentId;
  }

  if (lesson) filter.lesson = lesson;
  if (semester) filter.semester = semester;
  if (academicYear) filter.academicYear = academicYear;
  if (source) filter.source = source;
  if (gradeLevel) filter.gradeLevel = gradeLevel;
  if (classSection) filter.classSection = classSection;

  const skip = (page - 1) * limit;

  const [notes, total] = await Promise.all([
    Note.find(filter).sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
    Note.countDocuments(filter),
  ]);

  return { notes: notes as unknown as INote[], total, page, limit };
}

export async function getStudentNotes(params: StudentNotesParams): Promise<INote[]> {
  const { studentId, semester, academicYear } = params;

  const filter: MongoFilter<INote> = {
    studentId,
    isActive: true,
  };

  if (semester) filter.semester = semester;
  if (academicYear) filter.academicYear = academicYear;

  return Note.find(filter).sort({ lesson: 1, lastUpdated: -1 }).lean() as unknown as INote[];
}

export async function createNote(data: CreateNoteData): Promise<INote> {
  const noteData = { ...data, source: 'manual' };
  const note = new Note(noteData);
  await note.save();
  return note;
}

export async function updateNote(
  id: string,
  updateData: Record<string, unknown>,
  role: string | undefined,
  userId: string | undefined,
): Promise<UpdateNoteResult> {
  const existingNote = await Note.findById(id);
  if (!existingNote) {
    return { notFound: true };
  }

  const existingNoteDoc = existingNote as typeof existingNote & { createdBy?: string };
  if (role !== 'admin' && existingNoteDoc.createdBy && existingNoteDoc.createdBy !== userId) {
    return { forbidden: true };
  }

  const note = await Note.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  return { note: note as unknown as INote };
}

export async function softDeleteNote(id: string): Promise<{ notFound: true } | { deleted: true }> {
  const note = await Note.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!note) {
    return { notFound: true };
  }
  return { deleted: true };
}

export async function importExcelNotes(params: ImportExcelParams): Promise<ImportExcelResult> {
  const { fileBuffer, originalname, semester, academicYear, source, role, userId, ip, userAgent } =
    params;

  const notes = ExcelImportService.parseFileByExtension(fileBuffer, originalname);
  const validation = ExcelImportService.validateNoteData(notes);

  if (validation.errors.length > 0) {
    return { fileErrors: validation.errors };
  }

  const studentIds = validation.valid.map((note) => note.studentId);
  const studentValidation = await ExcelImportService.validateStudentIds(studentIds);

  if (studentValidation.invalid.length > 0) {
    return { invalidIds: studentValidation.invalid };
  }

  if (role === 'teacher') {
    const teacher = (await User.findOne({ id: userId, rol: 'teacher' })
      .select('sinif sube')
      .lean()) as { sinif?: string; sube?: string } | null;
    if (!teacher?.sinif) {
      logSecurityEvent({
        event: SecurityEvent.NOTES_BULK_IMPORT_REJECTED,
        userId,
        ip,
        userAgent,
        details: { reason: 'teacher_has_no_assigned_class', count: studentIds.length },
      });
      return { teacherRejection: { reason: 'no_class' } };
    }
    const ownedStudents = await User.find({
      id: { $in: studentIds },
      rol: 'student',
      sinif: teacher.sinif,
    })
      .select('id')
      .lean();
    const ownedIds = new Set(ownedStudents.map((s) => s.id));
    const unauthorized = studentIds.filter((id) => !ownedIds.has(id));
    if (unauthorized.length > 0) {
      logSecurityEvent({
        event: SecurityEvent.NOTES_BULK_IMPORT_REJECTED,
        userId,
        ip,
        userAgent,
        details: {
          reason: 'student_outside_teacher_class',
          teacherSinif: teacher.sinif,
          unauthorizedCount: unauthorized.length,
          sample: unauthorized.slice(0, 10),
        },
      });
      return {
        teacherRejection: {
          reason: 'unauthorized_students',
          unauthorizedCount: unauthorized.length,
        },
      };
    }
  }

  const noteDocs = validation.valid.map((noteData) => ({
    studentId: noteData.studentId,
    lesson: noteData.subject,
    grade: noteData.note,
    date: new Date(noteData.date),
    description: noteData.description,
    semester,
    academicYear,
    source: source || 'excel',
    isActive: true,
  }));
  const savedNotes = await Note.insertMany(noteDocs, { ordered: false });

  logSecurityEvent({
    event: SecurityEvent.NOTES_BULK_IMPORT,
    userId,
    ip,
    userAgent,
    details: {
      role,
      imported: savedNotes.length,
      semester,
      academicYear,
      source: source || 'excel',
      uniqueStudents: new Set(studentIds).size,
    },
  });

  return { imported: savedNotes.length, errors: validation.errors };
}

export async function getStats(params: StatsParams): Promise<StatsResult> {
  const { role, userId, semester, academicYear, gradeLevel, classSection } = params;

  const filter: MongoFilter<INote> = { isActive: true };

  if (role === 'student') {
    filter.studentId = userId;
  } else if (role === 'parent') {
    const childIds = await getParentChildIds(userId!);
    if (childIds.length === 0) {
      return { earlyEmpty: true };
    }
    filter.studentId = { $in: childIds };
  }

  if (semester) filter.semester = semester;
  if (academicYear) filter.academicYear = academicYear;
  if (gradeLevel) filter.gradeLevel = gradeLevel;
  if (classSection) filter.classSection = classSection;

  const stats = await Note.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          lesson: '$lesson',
          semester: '$semester',
          academicYear: '$academicYear',
        },
        count: { $sum: 1 },
        avgGrade: { $avg: '$grade' },
        minGrade: { $min: '$grade' },
        maxGrade: { $max: '$grade' },
      },
    },
    { $sort: { '_id.lesson': 1 } },
  ]);

  return { stats };
}

export async function bulkUpdateNotes(params: BulkUpdateParams): Promise<BulkUpdateResult> {
  const { notes, role, userId } = params;

  const updatePromises = notes.map(async (noteUpdate: NoteUpdateEntry) => {
    const { id, ...updateData } = noteUpdate;

    if (role !== 'admin') {
      const existingNote = await Note.findById(id);
      if (
        existingNote &&
        (existingNote as typeof existingNote & { createdBy?: string }).createdBy &&
        (existingNote as typeof existingNote & { createdBy?: string }).createdBy !== userId
      ) {
        return null;
      }
    }

    return Note.findByIdAndUpdate(id, updateData, { new: true });
  });

  const results = await Promise.all(updatePromises);
  const updatedNotes = results.filter(Boolean) as (INote | null)[];

  return { updated: updatedNotes.length, notes: updatedNotes };
}

export async function getTemplates(): Promise<string[]> {
  return Note.distinct('lesson');
}

export async function searchNotes(params: SearchParams): Promise<SearchResult> {
  const { q, role, userId, semester, academicYear } = params;

  const searchRe = safeSearchRegex(q);
  if (searchRe === null) {
    return { invalidQuery: true };
  }

  const filter: MongoFilter<INote> = {
    isActive: true,
    $or: [{ studentId: searchRe }, { lesson: searchRe }, { description: searchRe }],
  };

  if (role === 'student') {
    filter.studentId = userId;
  } else if (role === 'parent') {
    const childIds = await getParentChildIds(userId!);
    if (childIds.length === 0) {
      return { earlyEmpty: true };
    }
    filter.studentId = { $in: childIds };
  }

  if (semester) filter.semester = semester;
  if (academicYear) filter.academicYear = academicYear;

  const notes = await Note.find(filter).sort({ lastUpdated: -1 }).limit(50).lean();
  return { notes: notes as unknown as INote[] };
}

export async function backupNotes(params: BackupParams): Promise<BackupData> {
  const { semester, academicYear } = params;

  const notes = await Note.find({
    semester,
    academicYear,
    isActive: true,
  }).lean();

  return {
    timestamp: new Date(),
    semester,
    academicYear,
    count: notes.length,
    notes: notes as unknown as INote[],
  };
}

export const NotesService = {
  listNotes,
  getStudentNotes,
  createNote,
  updateNote,
  softDeleteNote,
  importExcelNotes,
  getStats,
  bulkUpdateNotes,
  getTemplates,
  searchNotes,
  backupNotes,
};
