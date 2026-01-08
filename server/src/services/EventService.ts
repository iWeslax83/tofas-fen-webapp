/**
 * Event Service - Event-driven architecture with Redis Pub/Sub
 * Handles domain events and real-time notifications
 */

import { Redis } from 'ioredis';
import logger from '../utils/logger';
import { getWebSocket } from '../utils/websocket';
import { eventsPublished, eventsProcessed } from '../utils/metrics';

// Event types
export enum EventType {
  // Announcement events
  ANNOUNCEMENT_CREATED = 'announcement.created',
  ANNOUNCEMENT_UPDATED = 'announcement.updated',
  ANNOUNCEMENT_DELETED = 'announcement.deleted',
  
  // Homework events
  HOMEWORK_CREATED = 'homework.created',
  HOMEWORK_UPDATED = 'homework.updated',
  HOMEWORK_SUBMITTED = 'homework.submitted',
  
  // Evci Request events
  EVCI_REQUEST_CREATED = 'evci_request.created',
  EVCI_REQUEST_APPROVED = 'evci_request.approved',
  EVCI_REQUEST_REJECTED = 'evci_request.rejected',
  
  // Note events
  NOTE_ADDED = 'note.added',
  NOTE_UPDATED = 'note.updated',
  
  // Club events
  CLUB_CREATED = 'club.created',
  CLUB_MEMBER_JOINED = 'club.member_joined',
  CLUB_MEMBER_LEFT = 'club.member_left',
  
  // Notification events
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
  
  // User events
  USER_UPDATED = 'user.updated',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
}

// Event payload interface
export interface EventPayload {
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

// Event handler type
export type EventHandler = (payload: EventPayload) => Promise<void> | void;

class EventService {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private isSubscribed: boolean = false;

  constructor() {
    // Create Redis clients for pub/sub
    const redisUrl = process.env.REDIS_URL;
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    // Prefer REDIS_URL if provided (supports Upstash rediss:// URLs), otherwise fall back to host/port
    if (redisUrl) {
      logger.info('Using REDIS_URL for EventService:', redisUrl.split('@').pop());
      this.publisher = new Redis(redisUrl);
      this.subscriber = new Redis(redisUrl);
    } else {
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);
    }

    this.setupEventHandlers();
    this.setupRedisHandlers();
  }

  private setupRedisHandlers() {
    // Publisher error handling
    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error:', error);
    });

    // Subscriber error handling
    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });

    // Connection events
    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
      this.subscribeToEvents();
    });
  }

  private async subscribeToEvents() {
    if (this.isSubscribed) return;

    try {
      // Subscribe to all event channels
      const channels = Object.values(EventType);
      await this.subscriber.psubscribe(...channels.map(ch => `event:${ch}`));
      
      // Handle incoming messages
      this.subscriber.on('pmessage', async (pattern, channel, message) => {
        try {
          const payload: EventPayload = JSON.parse(message);
          await this.handleEvent(payload);
        } catch (error) {
          logger.error('Error handling event from Redis:', error);
        }
      });

      this.isSubscribed = true;
      logger.info('Subscribed to Redis event channels');
    } catch (error) {
      logger.error('Error subscribing to Redis events:', error);
    }
  }

  /**
   * Publish an event
   */
  async publish(eventType: EventType, data: Record<string, any>, userId?: string, metadata?: Record<string, any>): Promise<void> {
    const payload: EventPayload = {
      eventId: this.generateEventId(),
      eventType,
      timestamp: new Date(),
      userId,
      data,
      metadata,
    };

    try {
      const channel = `event:${eventType}`;
      await this.publisher.publish(channel, JSON.stringify(payload));
      eventsPublished.inc({ event_type: eventType });
      logger.debug(`Event published: ${eventType}`, { eventId: payload.eventId, userId });
    } catch (error) {
      logger.error(`Error publishing event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to an event type
   */
  subscribe(eventType: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(payload: EventPayload): Promise<void> {
    const handlers = this.handlers.get(payload.eventType);
    
    if (!handlers || handlers.size === 0) {
      logger.debug(`No handlers for event type: ${payload.eventType}`);
      return;
    }

    // Execute all handlers in parallel
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload);
        eventsProcessed.inc({ event_type: payload.eventType, status: 'success' });
      } catch (error) {
        eventsProcessed.inc({ event_type: payload.eventType, status: 'error' });
        logger.error(`Error in event handler for ${payload.eventType}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Setup default event handlers
   */
  private setupEventHandlers() {
    // Notification events - send via WebSocket
    this.subscribe(EventType.NOTIFICATION_CREATED, async (payload) => {
      const ws = getWebSocket();
      if (ws && payload.userId) {
        ws.sendNotification(payload.userId, payload.data);
      }
    });

    // Announcement events - broadcast to relevant users
    this.subscribe(EventType.ANNOUNCEMENT_CREATED, async (payload) => {
      const ws = getWebSocket();
      if (ws) {
        // Broadcast to all connected users or specific target audience
        const targetUsers = payload.data.targetAudience || [];
        if (targetUsers.length > 0) {
          ws.sendBulkNotifications(targetUsers, payload.data);
        } else {
          ws.broadcastNotification(payload.data);
        }
      }
    });

    // Evci request events - notify relevant users
    this.subscribe(EventType.EVCI_REQUEST_APPROVED, async (payload) => {
      const ws = getWebSocket();
      if (ws && payload.userId) {
        ws.sendNotification(payload.userId, {
          title: 'Evci İzni Onaylandı',
          message: payload.data.message || 'Evci izniniz onaylandı',
          type: 'success',
        });
      }
    });

    this.subscribe(EventType.EVCI_REQUEST_REJECTED, async (payload) => {
      const ws = getWebSocket();
      if (ws && payload.userId) {
        ws.sendNotification(payload.userId, {
          title: 'Evci İzni Reddedildi',
          message: payload.data.message || 'Evci izniniz reddedildi',
          type: 'error',
        });
      }
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   */
  getStats() {
    return {
      subscribedChannels: Object.values(EventType).length,
      registeredHandlers: Array.from(this.handlers.entries()).reduce(
        (acc, [type, handlers]) => {
          acc[type] = handlers.size;
          return acc;
        },
        {} as Record<string, number>
      ),
      isSubscribed: this.isSubscribed,
    };
  }

  /**
   * Cleanup
   */
  async disconnect(): Promise<void> {
    try {
      await this.subscriber.punsubscribe();
      await this.publisher.quit();
      await this.subscriber.quit();
      logger.info('Event service disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting event service:', error);
    }
  }
}

// Singleton instance
let eventService: EventService | null = null;

export const getEventService = (): EventService => {
  if (!eventService) {
    eventService = new EventService();
  }
  return eventService;
};

export default EventService;

