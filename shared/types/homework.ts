/**
 * Shared Homework Types
 */

export interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string | Date;
  teacherId: string;
  teacherName?: string;
  class?: string;
  section?: string;
  subject?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateHomeworkRequest {
  title: string;
  description: string;
  dueDate: string | Date;
  class?: string;
  section?: string;
  subject?: string;
}

export interface UpdateHomeworkRequest extends Partial<CreateHomeworkRequest> {
  id: string;
}

