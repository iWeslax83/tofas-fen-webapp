import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import logger from './logger';

interface NotificationMessage {
  type: 'new_notification' | 'notification_read' | 'notification_archived';
  userId: string;
  notification?: any;
  notificationId?: string;
}

class NotificationWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/notifications'
    });

    this.setupWebSocket();
    logger.info('WebSocket server started for notifications');
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const userId = this.extractUserId(request.url);
      
      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      // Store client connection
      this.clients.set(userId, ws);

      logger.info(`WebSocket connected for user: ${userId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Notification connection established',
        userId
      }));

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(userId);
        logger.info(`WebSocket disconnected for user: ${userId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
        this.clients.delete(userId);
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message: NotificationMessage = JSON.parse(data.toString());
          this.handleMessage(userId, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
    });
  }

  private extractUserId(url: string | undefined): string | null {
    if (!url) return null;
    
    const match = url.match(/\/notifications\/(.+)$/);
    return match ? match[1] : null;
  }

  private handleMessage(userId: string, message: NotificationMessage) {
    switch (message.type) {
      case 'notification_read':
        // Handle notification read acknowledgment
        logger.info(`Notification read acknowledged for user ${userId}: ${message.notificationId}`);
        break;
      
      case 'notification_archived':
        // Handle notification archive acknowledgment
        logger.info(`Notification archived acknowledged for user ${userId}: ${message.notificationId}`);
        break;
      
      default:
        logger.warn(`Unknown message type from user ${userId}: ${message.type}`);
    }
  }

  /**
   * Send notification to specific user
   */
  public sendNotification(userId: string, notification: any) {
    const client = this.clients.get(userId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      const message: NotificationMessage = {
        type: 'new_notification',
        userId,
        notification
      };

      try {
        client.send(JSON.stringify(message));
        logger.info(`Notification sent to user ${userId}: ${notification.title}`);
      } catch (error) {
        logger.error(`Error sending notification to user ${userId}:`, error);
        this.clients.delete(userId);
      }
    } else {
      logger.debug(`User ${userId} not connected, notification will be delivered on next connection`);
    }
  }

  /**
   * Send notification to multiple users
   */
  public sendBulkNotifications(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Send notification to all connected users
   */
  public broadcastNotification(notification: any) {
    const message: NotificationMessage = {
      type: 'new_notification',
      userId: 'broadcast',
      notification
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting notification:', error);
        }
      }
    });

    logger.info(`Notification broadcasted to ${this.wss.clients.size} clients`);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  /**
   * Get list of connected user IDs
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    const client = this.clients.get(userId);
    return client ? client.readyState === WebSocket.OPEN : false;
  }

  /**
   * Disconnect specific user
   */
  public disconnectUser(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.close(1000, 'User disconnected by server');
      this.clients.delete(userId);
      logger.info(`User ${userId} disconnected by server`);
    }
  }

  /**
   * Disconnect all users
   */
  public disconnectAll() {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });
    this.clients.clear();
    logger.info('All WebSocket connections closed');
  }

  /**
   * Get server statistics
   */
  public getStats() {
    return {
      totalConnections: this.wss.clients.size,
      activeConnections: this.clients.size,
      connectedUsers: this.getConnectedUsers(),
      uptime: process.uptime()
    };
  }
}

// Singleton instance
let notificationWebSocket: NotificationWebSocket | null = null;

export const initializeWebSocket = (server: Server): NotificationWebSocket => {
  if (!notificationWebSocket) {
    notificationWebSocket = new NotificationWebSocket(server);
  }
  return notificationWebSocket;
};

export const getWebSocket = (): NotificationWebSocket | null => {
  return notificationWebSocket;
};

export default NotificationWebSocket;
