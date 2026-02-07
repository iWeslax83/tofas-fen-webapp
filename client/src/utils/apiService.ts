import { SecureAPI } from './api';
import {
  handleResponse,
  handleResponseArray
} from './apiResponseHandler';
import { API_ENDPOINTS } from './apiEndpoints';
import { User } from '../types/user';
// Removed unused import

// Standard API service class
export class ApiService {
  /**
   * Generic GET request with standardized response handling
   */
  static async get<T>(
    endpoint: string,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.get(endpoint, config),
      {} as T
    );
  }

  /**
   * Generic POST request with standardized response handling
   */
  static async post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.post(endpoint, data, config),
      {} as T
    );
  }

  /**
   * Generic PUT request with standardized response handling
   */
  static async put<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.put(endpoint, data, config),
      {} as T
    );
  }

  /**
   * Generic PATCH request with standardized response handling
   */
  static async patch<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.patch(endpoint, data, config),
      {} as T
    );
  }

  /**
   * Generic DELETE request with standardized response handling
   */
  static async delete<T>(
    endpoint: string,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.delete(endpoint, config),
      {} as T
    );
  }

  /**
   * Generic file upload with standardized response handling
   */
  static async upload<T>(
    endpoint: string,
    formData: FormData,
    config?: Record<string, unknown>
  ): Promise<{ data: T; error: string | null }> {
    return handleResponse(
      SecureAPI.upload(endpoint, formData, config),
      {} as T
    );
  }

  /**
   * Generic array response GET request
   */
  static async getArray<T>(
    endpoint: string,
    config?: Record<string, unknown>
  ): Promise<{ data: T[]; error: string | null }> {
    return handleResponseArray(
      SecureAPI.get(endpoint, config),
      []
    );
  }
}

// User management service
export class UserService {
  static async getUsers() {
    return ApiService.getArray(API_ENDPOINTS.USER.BASE);
  }

  static async getUserById(id: string) {
    return ApiService.get(API_ENDPOINTS.USER.GET_BY_ID(id));
  }

  static async getCurrentUser() {
    return ApiService.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  static async getUsersByRole(role: string) {
    return ApiService.get(API_ENDPOINTS.USER.GET_BY_ROLE(role));
  }

  static async getStudentsByRole(role: string) {
    return ApiService.get(API_ENDPOINTS.USER.GET_BY_ROLE(role));
  }

  static async getChildren(parentId: string) {
    return ApiService.getArray(API_ENDPOINTS.USER.GET_CHILDREN(parentId));
  }

  static async createUser(userData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.USER.CREATE, userData);
  }

  static async updateUser(id: string, userData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.USER.UPDATE(id), userData);
  }


  static async deleteUser(id: string) {
    return ApiService.delete(API_ENDPOINTS.USER.DELETE(id));
  }

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor

  static async sendEmailVerification(userId: string, email: string) {
    return ApiService.post(`${API_ENDPOINTS.USER.EMAIL}/send-code`, { userId, email });
  }

  static async verifyEmailCode(userId: string, code: string) {
    return ApiService.post(`${API_ENDPOINTS.USER.EMAIL}/verify-code`, { userId, code });
  }


  static async linkParentChild(parentId: string, childId: string) {
    return ApiService.post(API_ENDPOINTS.USER.PARENT_CHILD.LINK, { parentId, childId });
  }

  static async unlinkParentChild(parentId: string, childId: string) {
    return ApiService.delete(API_ENDPOINTS.USER.PARENT_CHILD.UNLINK, {
      data: { parentId, childId }
    });
  }
}

// Notes service
export class NotesService {
  static async getNotes() {
    return ApiService.getArray(API_ENDPOINTS.NOTES.BASE);
  }

  static async createNote(noteData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.NOTES.CREATE, noteData);
  }

  static async updateNote(id: string, noteData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.NOTES.UPDATE(id), noteData);
  }

  static async deleteNote(id: string) {
    return ApiService.delete(API_ENDPOINTS.NOTES.DELETE(id));
  }

  static async bulkUpdateNotes(noteIds: string[], updates: Partial<{ subject: string; note: number; examType: string; date: string | Date }>) {
    return ApiService.put(API_ENDPOINTS.NOTES.BULK_UPDATE, { noteIds, updates });
  }

  static async getNotesStats() {
    return ApiService.get(API_ENDPOINTS.NOTES.STATS);
  }

  static async getImportFormats() {
    return ApiService.get(API_ENDPOINTS.NOTES.IMPORT.FORMATS);
  }

  static async importNotesFile(formData: FormData) {
    return ApiService.upload(API_ENDPOINTS.NOTES.IMPORT.FILE, formData);
  }

  static async downloadTemplate() {
    return ApiService.get(API_ENDPOINTS.NOTES.TEMPLATE.DOWNLOAD);
  }
}

// Homework service
export class HomeworkService {
  static async getHomeworks() {
    return ApiService.getArray(API_ENDPOINTS.HOMEWORKS.BASE);
  }

  static async createHomework(homeworkData: { title: string; description: string; dueDate: string | Date; class?: string; section?: string; subject?: string }) {
    return ApiService.post(API_ENDPOINTS.HOMEWORKS.CREATE, homeworkData);
  }

  static async updateHomework(id: string, homeworkData: Partial<{ title: string; description: string; dueDate: string | Date; class?: string; section?: string; subject?: string }>) {
    return ApiService.put(API_ENDPOINTS.HOMEWORKS.UPDATE(id), homeworkData);
  }

  static async deleteHomework(id: string) {
    return ApiService.delete(API_ENDPOINTS.HOMEWORKS.DELETE(id));
  }

  static async getHomeworksByStudent(studentId: string) {
    return ApiService.getArray(API_ENDPOINTS.HOMEWORKS.GET_BY_STUDENT(studentId));
  }

  static async getHomeworksByTeacher(teacherId: string) {
    return ApiService.getArray(API_ENDPOINTS.HOMEWORKS.GET_BY_TEACHER(teacherId));
  }
}

// Announcements service
export class AnnouncementService {
  static async getAnnouncements() {
    return ApiService.getArray(API_ENDPOINTS.ANNOUNCEMENTS.BASE);
  }

  static async createAnnouncement(announcementData: { title: string; content: string; targetRoles?: string[]; targetClasses?: string[]; priority?: 'low' | 'medium' | 'high' }) {
    return ApiService.post(API_ENDPOINTS.ANNOUNCEMENTS.CREATE, announcementData);
  }

  static async updateAnnouncement(id: string, announcementData: Partial<{ title: string; content: string; targetRoles?: string[]; targetClasses?: string[]; priority?: 'low' | 'medium' | 'high' }>) {
    return ApiService.put(API_ENDPOINTS.ANNOUNCEMENTS.UPDATE(id), announcementData);
  }

  static async deleteAnnouncement(id: string) {
    return ApiService.delete(API_ENDPOINTS.ANNOUNCEMENTS.DELETE(id));
  }

  static async getAnnouncementsByRole(role: string) {
    return ApiService.getArray(API_ENDPOINTS.ANNOUNCEMENTS.GET_BY_ROLE(role));
  }
}

// Schedule service
export class ScheduleService {
  static async getSchedule() {
    return ApiService.getArray(API_ENDPOINTS.SCHEDULE.BASE);
  }

  static async createSchedule(scheduleData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.SCHEDULE.CREATE, scheduleData);
  }

  static async updateSchedule(id: string, scheduleData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.SCHEDULE.UPDATE(id), scheduleData);
  }

  static async deleteSchedule(id: string) {
    return ApiService.delete(API_ENDPOINTS.SCHEDULE.DELETE(id));
  }

  static async getScheduleByClass(classLevel: string, section: string) {
    return ApiService.getArray(API_ENDPOINTS.SCHEDULE.GET_BY_CLASS(classLevel, section));
  }

  static async getScheduleByTeacher(teacherId: string) {
    return ApiService.getArray(API_ENDPOINTS.SCHEDULE.GET_BY_TEACHER(teacherId));
  }
}

// Calendar service
export class CalendarService {
  // Calendar management
  static async getCalendars() {
    return ApiService.getArray(API_ENDPOINTS.CALENDAR.CALENDARS.BASE);
  }

  static async getCalendarById(id: string) {
    return ApiService.get(API_ENDPOINTS.CALENDAR.CALENDARS.GET_BY_ID(id));
  }

  static async createCalendar(calendarData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.CALENDAR.CALENDARS.CREATE, calendarData);
  }

  static async updateCalendar(id: string, calendarData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.CALENDAR.CALENDARS.UPDATE(id), calendarData);
  }

  static async deleteCalendar(id: string) {
    return ApiService.delete(API_ENDPOINTS.CALENDAR.CALENDARS.DELETE(id));
  }

  static async shareCalendar(id: string, shareData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.CALENDAR.CALENDARS.SHARE(id), shareData);
  }

  // Event management
  static async getEvents(params?: Record<string, string | number | boolean>) {
    const endpoint = params
      ? `${API_ENDPOINTS.CALENDAR.EVENTS.BASE}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`
      : API_ENDPOINTS.CALENDAR.EVENTS.BASE;
    return ApiService.getArray(endpoint);
  }

  static async getEventById(id: string) {
    return ApiService.get(API_ENDPOINTS.CALENDAR.EVENTS.GET_BY_ID(id));
  }

  static async createEvent(eventData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.CALENDAR.EVENTS.CREATE, eventData);
  }

  static async updateEvent(id: string, eventData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.CALENDAR.EVENTS.UPDATE(id), eventData);
  }

  static async deleteEvent(id: string) {
    return ApiService.delete(API_ENDPOINTS.CALENDAR.EVENTS.DELETE(id));
  }

  static async respondToEvent(id: string, response: string) {
    return ApiService.post(API_ENDPOINTS.CALENDAR.EVENTS.RESPOND(id), { response });
  }

  // Analytics
  static async getCalendarStats() {
    return ApiService.get(API_ENDPOINTS.CALENDAR.STATS);
  }

  // Export/Import
  static async exportCalendar(calendarId: string, params?: Record<string, string | number | boolean>) {
    const endpoint = params
      ? `${API_ENDPOINTS.CALENDAR.EXPORT.BASE(calendarId)}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`
      : API_ENDPOINTS.CALENDAR.EXPORT.BASE(calendarId);
    return ApiService.get(endpoint);
  }

  static async importCalendar(calendarId: string, events: unknown[]) {
    return ApiService.post(API_ENDPOINTS.CALENDAR.IMPORT.BASE(calendarId), { events });
  }
}

// Evci service
export class EvciService {
  static async getEvciRequests() {
    return ApiService.getArray(API_ENDPOINTS.EVCI.BASE);
  }

  static async createEvciRequest(evciData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.EVCI.CREATE, evciData);
  }

  static async updateEvciRequest(id: string, evciData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.EVCI.UPDATE(id), evciData);
  }

  static async deleteEvciRequest(id: string) {
    return ApiService.delete(API_ENDPOINTS.EVCI.DELETE(id));
  }

  static async getEvciRequestsByStudent(studentId: string) {
    return ApiService.getArray(API_ENDPOINTS.EVCI.GET_BY_STUDENT(studentId));
  }

  static async getEvciRequestsByParent(parentId: string) {
    return ApiService.getArray(API_ENDPOINTS.EVCI.GET_BY_PARENT(parentId));
  }
}

// Requests service
export class RequestService {
  static async getRequests() {
    return ApiService.getArray(API_ENDPOINTS.REQUESTS.BASE);
  }

  static async createRequest(requestData: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.REQUESTS.CREATE, requestData);
  }

  static async updateRequest(id: string, requestData: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.REQUESTS.UPDATE(id), requestData);
  }

  static async deleteRequest(id: string) {
    return ApiService.delete(API_ENDPOINTS.REQUESTS.DELETE(id));
  }

  static async getRequestsByUser(userId: string) {
    return ApiService.getArray(API_ENDPOINTS.REQUESTS.GET_BY_USER(userId));
  }

  static async getRequestsByStatus(status: string) {
    return ApiService.getArray(API_ENDPOINTS.REQUESTS.GET_BY_STATUS(status));
  }

  // Additional methods for specific request types
  static async createClassChangeRequest(requestData: {
    userId: string;
    currentClass: string;
    currentSection: string;
    newClass: string;
    newSection: string;
    reason: string;
  }) {
    return ApiService.post(API_ENDPOINTS.REQUESTS.CREATE, {
      ...requestData,
      type: 'class-change',
      details: {
        sinif: requestData.newClass,
        sube: requestData.newSection,
        currentClass: requestData.currentClass,
        currentSection: requestData.currentSection,
        reason: requestData.reason
      }
    });
  }

  static async createRoomChangeRequest(requestData: {
    userId: string;
    currentRoom: string;
    newRoom: string;
    reason: string;
  }) {
    return ApiService.post(API_ENDPOINTS.REQUESTS.CREATE, {
      ...requestData,
      type: 'room-change',
      details: {
        oda: requestData.newRoom,
        currentRoom: requestData.currentRoom,
        reason: requestData.reason
      }
    });
  }

  static async approveRequest(requestId: string, updates: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.REQUESTS.UPDATE(requestId), {
      status: 'approved',
      ...updates
    });
  }

  static async rejectRequest(requestId: string, reason?: string) {
    return ApiService.put(API_ENDPOINTS.REQUESTS.UPDATE(requestId), {
      status: 'rejected',
      rejectionReason: reason
    });
  }
}


// Monitoring service
export class MonitoringService {
  static async getHealth() {
    return ApiService.get(API_ENDPOINTS.MONITORING.HEALTH);
  }

  static async getMetrics() {
    return ApiService.get(API_ENDPOINTS.MONITORING.METRICS);
  }

  static async getMemory() {
    return ApiService.get(API_ENDPOINTS.MONITORING.MEMORY);
  }

  static async getCPU() {
    return ApiService.get(API_ENDPOINTS.MONITORING.CPU);
  }

  static async getUptime() {
    return ApiService.get(API_ENDPOINTS.MONITORING.UPTIME);
  }

  static async getWarnings() {
    return ApiService.get(API_ENDPOINTS.MONITORING.WARNINGS);
  }
}

// File Management service
// File Management service - REMOVED


// Communication service
export class CommunicationService {
  // Message methods
  static async getMessages(conversationId: string, params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.MESSAGES.GET_BY_CONVERSATION(conversationId), { params });
  }

  static async createMessage(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.MESSAGES.CREATE, data);
  }

  static async updateMessage(id: string, data: Record<string, unknown>) {
    return ApiService.put(API_ENDPOINTS.COMMUNICATION.MESSAGES.UPDATE(id), data);
  }

  static async deleteMessage(id: string) {
    return ApiService.delete(API_ENDPOINTS.COMMUNICATION.MESSAGES.DELETE(id));
  }

  static async addReaction(messageId: string, emoji: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.MESSAGES.REACTIONS(messageId), { emoji });
  }

  // Conversation methods
  static async getConversations(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.CONVERSATIONS.BASE, { params });
  }

  static async getConversationById(id: string) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.CONVERSATIONS.GET_BY_ID(id));
  }

  static async createConversation(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CONVERSATIONS.CREATE, data);
  }

  static async addParticipant(conversationId: string, userId: string, role?: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CONVERSATIONS.PARTICIPANTS.ADD(conversationId), { userId, role });
  }

  static async removeParticipant(conversationId: string, userId: string) {
    return ApiService.delete(API_ENDPOINTS.COMMUNICATION.CONVERSATIONS.PARTICIPANTS.REMOVE(conversationId, userId));
  }

  // Email methods
  static async getEmails(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.EMAILS.BASE, { params });
  }

  static async createEmail(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.EMAILS.BASE, data);
  }

  static async sendEmail(id: string) {
    return ApiService.post(`${API_ENDPOINTS.COMMUNICATION.EMAILS.SEND}/${id}`, {});
  }

  // Chat room methods
  static async getChatRooms(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.CHATROOMS.BASE, { params });
  }

  static async createChatRoom(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CHATROOMS.CREATE, data);
  }

  static async joinChatRoom(id: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CHATROOMS.JOIN(id));
  }

  static async leaveChatRoom(id: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CHATROOMS.LEAVE(id));
  }

  // Contact methods
  static async getContacts(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.CONTACTS.BASE, { params });
  }

  static async createContact(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CONTACTS.CREATE, data);
  }

  static async updateContactStatus(id: string, status: string) {
    return ApiService.put(API_ENDPOINTS.COMMUNICATION.CONTACTS.STATUS(id), { status });
  }

  static async blockContact(id: string, reason?: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CONTACTS.BLOCK(id), { reason });
  }

  static async unblockContact(id: string) {
    return ApiService.post(API_ENDPOINTS.COMMUNICATION.CONTACTS.UNBLOCK(id));
  }

  // Search and analytics
  static async searchMessages(query: string, filters?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.SEARCH, {
      params: { q: query, ...filters }
    });
  }

  static async getCommunicationStats() {
    return ApiService.get(API_ENDPOINTS.COMMUNICATION.STATS);
  }

  // File upload for communication
  static async uploadFiles(formData: FormData) {
    return ApiService.upload(API_ENDPOINTS.COMMUNICATION.UPLOAD, formData);
  }
}

// Performance Service
export class PerformanceService {
  // Metrics methods
  static async getMetrics(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.METRICS.BASE, { params });
  }

  static async getMetricsByType(type: string, limit?: number) {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.METRICS.GET_BY_TYPE(type), {
      params: { limit }
    });
  }

  static async getCriticalMetrics() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.METRICS.CRITICAL);
  }

  static async recordMetric(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.METRICS.BASE, data);
  }

  // Optimization methods
  static async getOptimizations(params?: Record<string, string | number | boolean>) {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.OPTIMIZATIONS.BASE, { params });
  }

  static async createOptimization(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.OPTIMIZATIONS.BASE, data);
  }

  static async getOptimizationStats() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.OPTIMIZATIONS.STATS);
  }

  // Configuration methods
  static async getConfigs(category?: string) {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.CONFIGS.BASE, {
      params: { category }
    });
  }

  static async createConfig(data: Record<string, unknown>) {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.CONFIGS.BASE, data);
  }

  static async updateConfig(id: string, data: Record<string, unknown>) {
    return ApiService.patch(API_ENDPOINTS.PERFORMANCE.CONFIGS.UPDATE(id), data);
  }

  // System monitoring methods
  static async getSystemMetrics() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.SYSTEM.METRICS);
  }

  static async getDatabaseMetrics() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.SYSTEM.DATABASE);
  }

  static async getAPIMetrics() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.SYSTEM.API);
  }

  // Dashboard and health methods
  static async getDashboardData() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.DASHBOARD);
  }

  static async getHealthStatus() {
    return ApiService.get(API_ENDPOINTS.PERFORMANCE.HEALTH);
  }

  // Manual optimization triggers
  static async runScheduledOptimizations() {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.OPTIMIZE.SCHEDULED);
  }

  static async clearCache() {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.OPTIMIZE.CACHE);
  }

  static async optimizeDatabase() {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.OPTIMIZE.DATABASE);
  }

  static async cleanupMemory() {
    return ApiService.post(API_ENDPOINTS.PERFORMANCE.OPTIMIZE.MEMORY);
  }
}

// Dormitory service
export class DormitoryService {
  static async getMeals(params?: Record<string, string | number>) {
    return ApiService.getArray(API_ENDPOINTS.DORMITORY.MEALS.BASE, { params });
  }

  static async createMeal(formData: FormData) {
    return ApiService.upload(API_ENDPOINTS.DORMITORY.MEALS.CREATE, formData);
  }

  static async downloadMeal(id: string) {
    return SecureAPI.get(API_ENDPOINTS.DORMITORY.MEALS.DOWNLOAD(id), { responseType: 'blob' });
  }

  static async getSupervisors(params?: Record<string, string | number>) {
    return ApiService.getArray(API_ENDPOINTS.DORMITORY.SUPERVISORS.BASE, { params });
  }

  static async createSupervisor(formData: FormData) {
    return ApiService.upload(API_ENDPOINTS.DORMITORY.SUPERVISORS.CREATE, formData);
  }

  static async downloadSupervisor(id: string) {
    return SecureAPI.get(API_ENDPOINTS.DORMITORY.SUPERVISORS.DOWNLOAD(id), { responseType: 'blob' });
  }

  static async deleteSupervisor(id: string) {
    return ApiService.delete(API_ENDPOINTS.DORMITORY.SUPERVISORS.DELETE(id));
  }
}

// All services are already exported individually above
