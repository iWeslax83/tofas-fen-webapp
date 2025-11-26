/**
 * Analytics Service
 * User behavior tracking and analytics
 */

import logger from '../utils/logger';
import { User } from '../models/User';
import { Announcement } from '../models/Announcement';
import { Homework } from '../models/Homework';
import { EvciRequest } from '../models/EvciRequest';

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserBehaviorMetrics {
  pageViews: number;
  uniqueVisits: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number }>;
  userActions: Array<{ action: string; count: number }>;
}

export interface FeedbackData {
  userId: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private feedbackData: FeedbackData[] = [];

  /**
   * Track user event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        ...event,
        timestamp: new Date(),
      };

      // Store in memory (in production, use database or analytics service)
      this.events.push(analyticsEvent);

      // Log event
      logger.info('Analytics event tracked', {
        eventType: event.eventType,
        userId: event.userId,
        userRole: event.userRole,
      });

      // In production, send to analytics service (e.g., Google Analytics, Mixpanel)
      if (process.env.ANALYTICS_ENABLED === 'true') {
        await this.sendToAnalyticsService(analyticsEvent);
      }
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    userId: string | undefined,
    path: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'page_view',
      userId,
      metadata: {
        path,
        ...metadata,
      },
    });
  }

  /**
   * Track user action
   */
  async trackUserAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const user = await User.findById(userId);
    await this.trackEvent({
      eventType: 'user_action',
      userId,
      userRole: user?.rol,
      metadata: {
        action,
        ...metadata,
      },
    });
  }

  /**
   * Get user behavior metrics
   */
  async getUserBehaviorMetrics(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserBehaviorMetrics> {
    const filteredEvents = this.events.filter((event) => {
      if (userId && event.userId !== userId) return false;
      if (startDate && event.timestamp < startDate) return false;
      if (endDate && event.timestamp > endDate) return false;
      return event.eventType === 'page_view' || event.eventType === 'user_action';
    });

    const pageViews = filteredEvents.filter((e) => e.eventType === 'page_view');
    const uniqueVisits = new Set(pageViews.map((e) => e.sessionId || e.userId)).size;

    // Calculate top pages
    const pageCounts = new Map<string, number>();
    pageViews.forEach((event) => {
      const path = event.metadata?.path || 'unknown';
      pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
    });

    const topPages = Array.from(pageCounts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Calculate user actions
    const actionCounts = new Map<string, number>();
    filteredEvents
      .filter((e) => e.eventType === 'user_action')
      .forEach((event) => {
        const action = event.metadata?.action || 'unknown';
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      });

    const userActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    return {
      pageViews: pageViews.length,
      uniqueVisits,
      averageSessionDuration: 0, // Calculate from session data
      bounceRate: 0, // Calculate from session data
      topPages,
      userActions,
    };
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: Omit<FeedbackData, 'createdAt' | 'updatedAt'>): Promise<FeedbackData> {
    const feedbackData: FeedbackData = {
      ...feedback,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.feedbackData.push(feedbackData);

    logger.info('Feedback submitted', {
      userId: feedback.userId,
      type: feedback.type,
      category: feedback.category,
    });

    // In production, store in database
    // await FeedbackModel.create(feedbackData);

    return feedbackData;
  }

  /**
   * Get feedback list
   */
  async getFeedback(
    filters?: {
      userId?: string;
      type?: string;
      status?: string;
      priority?: string;
    }
  ): Promise<FeedbackData[]> {
    let filtered = [...this.feedbackData];

    if (filters?.userId) {
      filtered = filtered.filter((f) => f.userId === filters.userId);
    }
    if (filters?.type) {
      filtered = filtered.filter((f) => f.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter((f) => f.status === filters.status);
    }
    if (filters?.priority) {
      filtered = filtered.filter((f) => f.priority === filters.priority);
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get system analytics
   */
  async getSystemAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalAnnouncements: number;
    totalHomeworks: number;
    pendingEvciRequests: number;
    feedbackCount: number;
  }> {
    const [totalUsers, totalAnnouncements, totalHomeworks, pendingEvciRequests] = await Promise.all([
      User.countDocuments(),
      Announcement.countDocuments(),
      Homework.countDocuments(),
      EvciRequest.countDocuments({ status: 'pending' }),
    ]);

    // Active users (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      updatedAt: { $gte: thirtyDaysAgo },
    });

    return {
      totalUsers,
      activeUsers,
      totalAnnouncements,
      totalHomeworks,
      pendingEvciRequests,
      feedbackCount: this.feedbackData.length,
    };
  }

  /**
   * Send to external analytics service
   */
  private async sendToAnalyticsService(event: AnalyticsEvent): Promise<void> {
    // Integration with Google Analytics, Mixpanel, etc.
    // This is a placeholder
    if (process.env.GOOGLE_ANALYTICS_ID) {
      // Send to Google Analytics
      logger.debug('Sending event to Google Analytics', { eventType: event.eventType });
    }
  }

  /**
   * Clear old events (cleanup)
   */
  clearOldEvents(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.events = this.events.filter((event) => event.timestamp >= cutoffDate);
    logger.info(`Cleared events older than ${daysToKeep} days`);
  }
}

// Singleton instance
let analyticsService: AnalyticsService | null = null;

export const getAnalyticsService = (): AnalyticsService => {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();
  }
  return analyticsService;
};

export default AnalyticsService;
