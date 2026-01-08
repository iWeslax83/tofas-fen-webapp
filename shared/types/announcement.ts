/**
 * Shared Announcement Types
 */

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  targetRoles?: string[];
  targetClasses?: string[];
  priority?: 'low' | 'medium' | 'high';
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  targetRoles?: string[];
  targetClasses?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateAnnouncementRequest extends Partial<CreateAnnouncementRequest> {
  id: string;
}

