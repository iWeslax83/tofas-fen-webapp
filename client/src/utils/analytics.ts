/**
 * Frontend Analytics Utility
 * Track user behavior and send feedback
 * ⚠️ GÜVENLİK: httpOnly cookie ile auth yapılır, localStorage kullanılmaz
 */

import { apiClient } from './api';
import { safeConsoleError } from '../utils/safeLogger';

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  category: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

class Analytics {
  private sessionId: string;

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track page view
   */
  async trackPageView(path: string, metadata?: Record<string, any>): Promise<void> {
    try {
      await apiClient.post('/api/analytics/tracking', {
        path,
        metadata: {
          ...metadata,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        },
      });
    } catch (error) {
      // Silently fail - analytics should not break the app
    }
  }

  /**
   * Track user action
   */
  async trackAction(action: string, metadata?: Record<string, any>): Promise<void> {
    try {
      await apiClient.post('/api/analytics/action', {
        action,
        metadata: {
          ...metadata,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(
    feedback: FeedbackData,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post('/api/analytics/feedback', feedback);
      return response.data;
    } catch (error) {
      safeConsoleError('Error submitting feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await apiClient.get(`/api/analytics/metrics?${params.toString()}`);
      return response.data?.success ? response.data.data : null;
    } catch (error) {
      safeConsoleError('Error fetching metrics:', error);
      return null;
    }
  }
}

// Singleton instance
export const analytics = new Analytics();

// Auto-track page views
if (typeof window !== 'undefined') {
  // Track initial page view
  analytics.trackPageView(window.location.pathname);

  // Track route changes (for SPA)
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      analytics.trackPageView(lastPath);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export default analytics;
