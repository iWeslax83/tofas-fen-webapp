import { User } from '../models/User';
import Note from '../models/Note';
import { Club } from '../models/Club';
import { Schedule } from '../models/Schedule';
import { Homework } from '../models/Homework';
import { Notification } from '../models/Notification';
import { Analytics } from '../models/Analytics';
import { Report } from '../models/Report';

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  classLevel?: string;
  classSection?: string;
  subject?: string;
  teacherId?: string;
  studentId?: string;
  role?: string;
  clubId?: string;
  academicYear?: string;
  semester?: string;
}

export interface MetricResult {
  value: number | string | object;
  unit?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  
  // Academic Analytics
  static async getAcademicMetrics(filters: AnalyticsFilters = {}): Promise<Record<string, MetricResult>> {
    const results: Record<string, MetricResult> = {};
    
    try {
      // Average grades by subject
      const subjectAverages = await Note.aggregate([
        { $match: this.buildNoteFilters(filters) },
        {
          $group: {
            _id: '$lesson',
            average: { $avg: '$average' },
            count: { $sum: 1 },
            min: { $min: '$average' },
            max: { $max: '$average' }
          }
        },
        { $sort: { average: -1 } }
      ]);
      
      results.subjectAverages = {
        value: subjectAverages,
        unit: 'grade',
        metadata: { totalSubjects: subjectAverages.length }
      };

      // Class performance comparison
      const classPerformance = await Note.aggregate([
        { $match: this.buildNoteFilters(filters) },
        {
          $group: {
            _id: { sinif: '$gradeLevel', sube: '$classSection' },
            average: { $avg: '$average' },
            count: { $sum: 1 },
            subjects: { $addToSet: '$lesson' }
          }
        },
        { $sort: { average: -1 } }
      ]);
      
      results.classPerformance = {
        value: classPerformance,
        unit: 'grade',
        metadata: { totalClasses: classPerformance.length }
      };

      // Grade distribution
      const gradeDistribution = await Note.aggregate([
        { $match: this.buildNoteFilters(filters) },
        {
          $bucket: {
            groupBy: '$average',
            boundaries: [0, 50, 60, 70, 80, 90, 100],
            default: 'other',
            output: {
              count: { $sum: 1 },
              students: { $addToSet: '$studentId' }
            }
          }
        }
      ]);
      
      results.gradeDistribution = {
        value: gradeDistribution,
        unit: 'count',
        metadata: { totalGrades: gradeDistribution.reduce((sum, bucket) => sum + bucket.count, 0) }
      };

      // Top performing students
      const topStudents = await Note.aggregate([
        { $match: this.buildNoteFilters(filters) },
        {
          $group: {
            _id: '$studentId',
            studentName: { $first: '$studentName' },
            average: { $avg: '$average' },
            subjectCount: { $sum: 1 }
          }
        },
        { $sort: { average: -1 } },
        { $limit: 10 }
      ]);
      
      results.topStudents = {
        value: topStudents,
        unit: 'grade',
        metadata: { limit: 10 }
      };

      // Teacher performance analysis
      const teacherPerformance = await Note.aggregate([
        { $match: this.buildNoteFilters(filters) },
        {
          $group: {
            _id: '$teacherName',
            average: { $avg: '$average' },
            subjectCount: { $sum: 1 },
            studentCount: { $addToSet: '$studentId' }
          }
        },
        {
          $project: {
            teacherName: '$_id',
            average: 1,
            subjectCount: 1,
            studentCount: { $size: '$studentCount' }
          }
        },
        { $sort: { average: -1 } }
      ]);
      
      results.teacherPerformance = {
        value: teacherPerformance,
        unit: 'grade',
        metadata: { totalTeachers: teacherPerformance.length }
      };

    } catch (error) {
      console.error('Error calculating academic metrics:', error);
      throw error;
    }

    return results;
  }

  // User Analytics
  static async getUserMetrics(filters: AnalyticsFilters = {}): Promise<Record<string, MetricResult>> {
    const results: Record<string, MetricResult> = {};
    
    try {
      // User registration trends
      const registrationTrends = await User.aggregate([
        { $match: this.buildUserFilters(filters) },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              role: '$rol'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      
      results.registrationTrends = {
        value: registrationTrends,
        unit: 'count',
        metadata: { totalRegistrations: registrationTrends.reduce((sum, item) => sum + item.count, 0) }
      };

      // User activity by role
      const userActivity = await User.aggregate([
        { $match: this.buildUserFilters(filters) },
        {
          $group: {
            _id: '$rol',
            count: { $sum: 1 },
            activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
            avgLoginCount: { $avg: '$loginCount' },
            lastLoginAvg: { $avg: { $ifNull: ['$lastLogin', new Date(0)] } }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      results.userActivity = {
        value: userActivity,
        unit: 'count',
        metadata: { totalUsers: userActivity.reduce((sum, item) => sum + item.count, 0) }
      };

      // Class distribution
      const classDistribution = await User.aggregate([
        { $match: { rol: 'student', ...this.buildUserFilters(filters) } },
        {
          $group: {
            _id: { sinif: '$sinif', sube: '$sube' },
            count: { $sum: 1 },
            dormitoryCount: { $sum: { $cond: ['$pansiyon', 1, 0] } }
          }
        },
        { $sort: { '_id.sinif': 1, '_id.sube': 1 } }
      ]);
      
      results.classDistribution = {
        value: classDistribution,
        unit: 'count',
        metadata: { totalStudents: classDistribution.reduce((sum, item) => sum + item.count, 0) }
      };

      // Login activity
      const loginActivity = await User.aggregate([
        { $match: { lastLogin: { $exists: true }, ...this.buildUserFilters(filters) } },
        {
          $group: {
            _id: {
              year: { $year: '$lastLogin' },
              month: { $month: '$lastLogin' },
              day: { $dayOfMonth: '$lastLogin' }
            },
            count: { $sum: 1 },
            avgLoginCount: { $avg: '$loginCount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 } // Last 30 days
      ]);
      
      results.loginActivity = {
        value: loginActivity,
        unit: 'count',
        metadata: { days: 30 }
      };

    } catch (error) {
      console.error('Error calculating user metrics:', error);
      throw error;
    }

    return results;
  }

  // Club Analytics
  static async getClubMetrics(filters: AnalyticsFilters = {}): Promise<Record<string, MetricResult>> {
    const results: Record<string, MetricResult> = {};
    
    try {
      // Club membership statistics
      const clubMembership = await Club.aggregate([
        { $match: this.buildClubFilters(filters) },
        {
          $project: {
            name: 1,
            memberCount: { $size: '$members' },
            eventCount: { $size: '$events' },
            announcementCount: { $size: '$announcements' }
          }
        },
        { $sort: { memberCount: -1 } }
      ]);
      
      results.clubMembership = {
        value: clubMembership,
        unit: 'count',
        metadata: { totalClubs: clubMembership.length }
      };

      // Club activity trends
      const clubActivity = await Club.aggregate([
        { $match: this.buildClubFilters(filters) },
        {
          $project: {
            name: 1,
            events: {
              $map: {
                input: '$events',
                as: 'event',
                in: {
                  title: '$$event.title',
                  date: '$$event.date',
                  attendeeCount: { $size: '$$event.attendees' }
                }
              }
            },
            announcements: {
              $map: {
                input: '$announcements',
                as: 'announcement',
                in: {
                  title: '$$announcement.title',
                  timestamp: '$$announcement.timestamp'
                }
              }
            }
          }
        }
      ]);
      
      results.clubActivity = {
        value: clubActivity,
        unit: 'count',
        metadata: { totalClubs: clubActivity.length }
      };

      // Most active clubs
      const mostActiveClubs = await Club.aggregate([
        { $match: this.buildClubFilters(filters) },
        {
          $project: {
            name: 1,
            memberCount: { $size: '$members' },
            eventCount: { $size: '$events' },
            announcementCount: { $size: '$announcements' },
            chatCount: { $size: '$chats' },
            activityScore: {
              $add: [
                { $multiply: [{ $size: '$members' }, 1] },
                { $multiply: [{ $size: '$events' }, 2] },
                { $multiply: [{ $size: '$announcements' }, 1] },
                { $multiply: [{ $size: '$chats' }, 0.5] }
              ]
            }
          }
        },
        { $sort: { activityScore: -1 } },
        { $limit: 10 }
      ]);
      
      results.mostActiveClubs = {
        value: mostActiveClubs,
        unit: 'score',
        metadata: { limit: 10 }
      };

    } catch (error) {
      console.error('Error calculating club metrics:', error);
      throw error;
    }

    return results;
  }

  // System Analytics
  static async getSystemMetrics(filters: AnalyticsFilters = {}): Promise<Record<string, MetricResult>> {
    const results: Record<string, MetricResult> = {};
    
    try {
      // Notification statistics
      const notificationStats = await Notification.aggregate([
        { $match: this.buildNotificationFilters(filters) },
        {
          $group: {
            _id: {
              type: '$type',
              priority: '$priority',
              category: '$category'
            },
            count: { $sum: 1 },
            readCount: { $sum: { $cond: ['$read', 1, 0] } },
            unreadCount: { $sum: { $cond: ['$read', 0, 1] } }
          }
        }
      ]);
      
      results.notificationStats = {
        value: notificationStats,
        unit: 'count',
        metadata: { totalNotifications: notificationStats.reduce((sum, item) => sum + item.count, 0) }
      };

      // Homework statistics
      const homeworkStats = await Homework.aggregate([
        { $match: this.buildHomeworkFilters(filters) },
        {
          $group: {
            _id: {
              subject: '$subject',
              status: '$status',
              classLevel: '$classLevel'
            },
            count: { $sum: 1 },
            avgDaysToDue: {
              $avg: {
                $divide: [
                  { $subtract: ['$dueDate', '$assignedDate'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            }
          }
        }
      ]);
      
      results.homeworkStats = {
        value: homeworkStats,
        unit: 'count',
        metadata: { totalHomework: homeworkStats.reduce((sum, item) => sum + item.count, 0) }
      };

      // Schedule utilization
      const scheduleStats = await Schedule.aggregate([
        { $match: this.buildScheduleFilters(filters) },
        {
          $project: {
            classLevel: 1,
            classSection: 1,
            totalPeriods: {
              $reduce: {
                input: '$schedule',
                initialValue: 0,
                in: { $add: ['$$value', { $size: '$$this.periods' }] }
              }
            },
            uniqueSubjects: {
              $size: {
                $setUnion: {
                  $reduce: {
                    input: '$schedule',
                    initialValue: [],
                    in: { $concatArrays: ['$$value', '$$this.periods.subject'] }
                  }
                }
              }
            }
          }
        }
      ]);
      
      results.scheduleStats = {
        value: scheduleStats,
        unit: 'count',
        metadata: { totalSchedules: scheduleStats.length }
      };

    } catch (error) {
      console.error('Error calculating system metrics:', error);
      throw error;
    }

    return results;
  }

  // Helper methods for building filters
  private static buildNoteFilters(filters: AnalyticsFilters): any {
    const match: any = {};
    
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = filters.startDate;
      if (filters.endDate) match.createdAt.$lte = filters.endDate;
    }
    
    if (filters.classLevel) match.gradeLevel = filters.classLevel;
    if (filters.classSection) match.classSection = filters.classSection;
    if (filters.subject) match.lesson = filters.subject;
    if (filters.teacherId) match.teacherName = filters.teacherId;
    if (filters.studentId) match.studentId = filters.studentId;
    if (filters.academicYear) match.academicYear = filters.academicYear;
    if (filters.semester) match.semester = filters.semester;
    
    return match;
  }

  private static buildUserFilters(filters: AnalyticsFilters): any {
    const match: any = {};
    
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = filters.startDate;
      if (filters.endDate) match.createdAt.$lte = filters.endDate;
    }
    
    if (filters.classLevel) match.sinif = filters.classLevel;
    if (filters.classSection) match.sube = filters.classSection;
    if (filters.role) match.rol = filters.role;
    
    return match;
  }

  private static buildClubFilters(filters: AnalyticsFilters): any {
    const match: any = { isActive: true };
    
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = filters.startDate;
      if (filters.endDate) match.createdAt.$lte = filters.endDate;
    }
    
    if (filters.clubId) match.id = filters.clubId;
    
    return match;
  }

  private static buildNotificationFilters(filters: AnalyticsFilters): any {
    const match: any = {};
    
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = filters.startDate;
      if (filters.endDate) match.createdAt.$lte = filters.endDate;
    }
    
    return match;
  }

  private static buildHomeworkFilters(filters: AnalyticsFilters): any {
    const match: any = {};
    
    if (filters.startDate || filters.endDate) {
      match.assignedDate = {};
      if (filters.startDate) match.assignedDate.$gte = filters.startDate;
      if (filters.endDate) match.assignedDate.$lte = filters.endDate;
    }
    
    if (filters.subject) match.subject = filters.subject;
    if (filters.classLevel) match.classLevel = filters.classLevel;
    if (filters.classSection) match.classSection = filters.classSection;
    if (filters.teacherId) match.teacherId = filters.teacherId;
    
    return match;
  }

  private static buildScheduleFilters(filters: AnalyticsFilters): any {
    const match: any = { isActive: true };
    
    if (filters.classLevel) match.classLevel = filters.classLevel;
    if (filters.classSection) match.classSection = filters.classSection;
    if (filters.academicYear) match.academicYear = filters.academicYear;
    if (filters.semester) match.semester = filters.semester;
    
    return match;
  }

  // Save analytics data
  static async saveAnalytics(
    type: string,
    category: string,
    metric: string,
    value: any,
    period: string = 'all-time',
    filters: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const analyticsId = `${type}_${category}_${metric}_${Date.now()}`;
      
      await Analytics.create({
        id: analyticsId,
        type,
        category,
        metric,
        value,
        period,
        date: new Date(),
        filters,
        metadata,
        isActive: true
      });
    } catch (error) {
      console.error('Error saving analytics:', error);
      throw error;
    }
  }

  // Generate comprehensive report
  static async generateReport(
    title: string,
    type: string,
    category: string,
    template: string,
    filters: AnalyticsFilters = {},
    generatedBy: string
  ): Promise<any> {
    try {
      let metrics: Record<string, MetricResult> = {};
      
      // Collect metrics based on type
      switch (type) {
        case 'academic':
          metrics = await this.getAcademicMetrics(filters);
          break;
        case 'user':
          metrics = await this.getUserMetrics(filters);
          break;
        case 'club':
          metrics = await this.getClubMetrics(filters);
          break;
        case 'system':
          metrics = await this.getSystemMetrics(filters);
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      // Generate charts and tables
      const charts = this.generateCharts(metrics, template);
      const tables = this.generateTables(metrics, template);

      // Create report
      const reportId = `report_${type}_${category}_${Date.now()}`;
      const report = await Report.create({
        id: reportId,
        title,
        type,
        category,
        template,
        parameters: filters,
        filters,
        data: {
          raw: Object.values(metrics),
          aggregated: metrics,
          charts,
          tables
        },
        status: 'generated',
        generatedBy,
        generatedAt: new Date(),
        isPublic: false,
        allowedRoles: ['admin'],
        isActive: true
      });

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Generate charts from metrics
  private static generateCharts(metrics: Record<string, MetricResult>, template: string): any[] {
    const charts: any[] = [];
    
    // Implementation depends on the template and metrics
    // This is a simplified version - in practice, you'd have more sophisticated chart generation
    Object.entries(metrics).forEach(([key, metric]) => {
      if (Array.isArray(metric.value)) {
        const chart = this.createChartFromData(key, metric.value, template);
        if (chart) charts.push(chart);
      }
    });
    
    return charts;
  }

  // Generate tables from metrics
  private static generateTables(metrics: Record<string, MetricResult>, template: string): any[] {
    const tables: any[] = [];
    
    Object.entries(metrics).forEach(([key, metric]) => {
      if (Array.isArray(metric.value)) {
        const table = this.createTableFromData(key, metric.value, template);
        if (table) tables.push(table);
      }
    });
    
    return tables;
  }

  // Create chart from data
  private static createChartFromData(key: string, data: any[], template: string): any {
    // Simplified chart creation - in practice, you'd use a charting library
    if (data.length === 0) return null;
    
    const firstItem = data[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      const keys = Object.keys(firstItem).filter(k => k !== '_id');
      
      return {
        type: 'bar',
        data: {
          labels: data.map(item => item._id || item.name || item.title || 'Unknown'),
          datasets: keys.map(key => ({
            label: key,
            data: data.map(item => item[key] || 0)
          }))
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: key
            }
          }
        }
      };
    }
    
    return null;
  }

  // Create table from data
  private static createTableFromData(key: string, data: any[], template: string): any {
    if (data.length === 0) return null;
    
    const firstItem = data[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      const headers = Object.keys(firstItem).filter(k => k !== '_id');
      
      return {
        headers,
        rows: data.map(item => headers.map(header => item[header] || '')),
        summary: {
          total: data.length,
          key
        }
      };
    }
    
    return null;
  }
}
