/**
 * Enhanced WebSocket with Redis Pub/Sub integration
 * This extends the existing WebSocket implementation with event-driven capabilities
 */

import { getEventService, EventType } from '../services/EventService';
import { getWebSocket } from './websocket';
import logger from './logger';

/**
 * Initialize event-driven WebSocket enhancements
 */
export function initializeEventDrivenWebSocket() {
  const eventService = getEventService();
  const ws = getWebSocket();

  if (!ws) {
    logger.warn('WebSocket not initialized, skipping event-driven enhancements');
    return;
  }

  // Subscribe to all relevant events
  eventService.subscribe(EventType.ANNOUNCEMENT_CREATED, async (payload) => {
    logger.info('Announcement created event received', { eventId: payload.eventId });
    // WebSocket notification is handled in EventService
  });

  eventService.subscribe(EventType.HOMEWORK_CREATED, async (payload) => {
    logger.info('Homework created event received', { eventId: payload.eventId });
    if (payload.userId) {
      ws.sendNotification(payload.userId, {
        title: 'Yeni Ödev',
        message: payload.data.title || 'Yeni bir ödev eklendi',
        type: 'info',
        link: `/homeworks/${payload.data.id}`,
      });
    }
  });

  eventService.subscribe(EventType.NOTE_ADDED, async (payload) => {
    logger.info('Note added event received', { eventId: payload.eventId });
    if (payload.userId) {
      ws.sendNotification(payload.userId, {
        title: 'Yeni Not',
        message: `${payload.data.subject || 'Ders'} dersinden yeni not eklendi`,
        type: 'info',
        link: `/notes`,
      });
    }
  });

  eventService.subscribe(EventType.EVCI_REQUEST_CREATED, async (payload) => {
    logger.info('Evci request created event received', { eventId: payload.eventId });
    const parentIds = payload.data.parentIds as string[] | undefined;
    if (parentIds && parentIds.length > 0) {
      for (const parentId of parentIds) {
        ws.sendNotification(parentId, {
          title: 'Yeni Evci Talebi',
          message: `${payload.data.studentName || 'Öğrenci'} yeni bir evci talebi oluşturdu`,
          type: 'info',
          link: '/parent/evci',
        });
      }
    }
  });

  logger.info('Event-driven WebSocket enhancements initialized');
}

/**
 * Helper function to publish events from route handlers
 */
export async function publishEvent(
  eventType: EventType,
  data: Record<string, any>,
  userId?: string,
  metadata?: Record<string, any>
) {
  const eventService = getEventService();
  await eventService.publish(eventType, data, userId, metadata);
}

