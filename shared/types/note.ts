/**
 * Shared Note Types
 */

export interface Note {
  id: string;
  studentId: string;
  studentName?: string;
  subject: string;
  note: number;
  examType?: string;
  date: string | Date;
  teacherId?: string;
  teacherName?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BulkUpdateNotesRequest {
  noteIds: string[];
  updates: Partial<Note>;
}

