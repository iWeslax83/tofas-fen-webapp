/**
 * Frontend Analytics Utility
 * Track user behavior and send feedback
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TrackEventOptions {
  eventType: string;
  metadata?: Record<string, any>;
  userId?: string;
}

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
  private userId: string | null = null;

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Get user ID from auth store if available
    try {
      const authData = localStorage.getItem('auth_token');
      if (authData) {
        const parsed = JSON.parse(authData);
        this.userId = parsed.userId || null;
      }
    } catch (e) {
      // Ignore
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track page view
   */
  async trackPageView(path: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch(`${API_URL}/api/analytics/tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          path,
          metadata: {
            ...metadata,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          },
        }),
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  /**
   * Track user action
   */
  async trackAction(action: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch(`${API_URL}/api/analytics/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          metadata: {
            ...metadata,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_URL}/api/analytics/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(feedback),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
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
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(`${API_URL}/api/analytics/metrics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  }

  /**
   * Set user ID
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
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

