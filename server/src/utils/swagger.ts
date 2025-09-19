import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tofaş Fen Webapp API',
      version: '1.0.0',
      description: 'Tofaş Fen Lisesi web uygulaması için REST API dokümantasyonu',
      contact: {
        name: 'API Support',
        email: 'support@tofasfen.edu.tr',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { 
              type: 'string', 
              enum: ['student', 'teacher', 'admin', 'parent', 'service'] 
            },
            studentId: { type: 'string' },
            grade: { type: 'string' },
            section: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Club: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            president: { type: 'string' },
            anaBaskan: { type: 'string' },
            members: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            sender: { type: 'string' },
            content: { type: 'string' },
            clubId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            clubId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Homework: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            subject: { type: 'string' },
            teacherId: { type: 'string' },
            teacherName: { type: 'string' },
            classLevel: { type: 'string' },
            classSection: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'completed', 'expired'] },
            isPublished: { type: 'boolean' },
          },
        },
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            classLevel: { type: 'string' },
            classSection: { type: 'string' },
            academicYear: { type: 'string' },
            semester: { type: 'string' },
            schedule: { type: 'array', items: { type: 'object' } },
            isActive: { type: 'boolean' },
          },
        },
        MealList: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            year: { type: 'number' },
            fileUrl: { type: 'string' },
            uploadedBy: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        MaintenanceRequest: {
          type: 'object',
          properties: {
            studentId: { type: 'string' },
            studentName: { type: 'string' },
            roomNumber: { type: 'string' },
            issue: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            adminNote: { type: 'string' },
            serviceNote: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/auth.ts',
    './src/routes/clubs.ts',
    './src/routes/messages.ts',
    './src/routes/events.ts',
    './src/routes/announcements.ts',
    './src/routes/upload.ts',
    './src/routes/monitoring.ts',
    './src/routes/Homework.ts',
    './src/routes/Notes.ts',
    './src/routes/EvciRequest.ts',
    './src/routes/Schedule.ts',
    './src/routes/MealList.ts',
    './src/routes/SupervisorList.ts',
    './src/routes/MaintenanceRequest.ts',
    './src/routes/Request.ts',
    './src/routes/User.ts',
    './src/routes/Notification.ts',
  ],
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tofaş Fen API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
  },
};

export { specs, swaggerOptions }; 