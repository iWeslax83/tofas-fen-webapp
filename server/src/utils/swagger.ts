import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, RequestHandler } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tofas Fen Webapp API',
      version: '1.0.0',
      description: `
        # Tofas Fen Webapp API Documentation
        
        Bu API, Tofas Fen Lisesi öğrenci yönetim sistemi için geliştirilmiştir.
        
        ## Özellikler
        - Öğrenci, öğretmen, veli ve yönetici rolleri
        - Evci izin yönetimi
        - Not ve ödev takibi
        - Duyuru sistemi
        - Kulüp yönetimi
        - Güvenli kimlik doğrulama
        
        ## Kimlik Doğrulama
        API, JWT (JSON Web Token) tabanlı kimlik doğrulama kullanır.
        İsteklerde \`Authorization: Bearer <token>\` header'ı kullanın.
        
        ## Hata Kodları
        - 200: Başarılı
        - 400: Geçersiz istek
        - 401: Kimlik doğrulama gerekli
        - 403: Yetki yetersiz
        - 404: Kaynak bulunamadı
        - 500: Sunucu hatası
      `,
      contact: {
        name: 'API Support',
        email: 'support@tofasfen.com',
        url: 'https://tofasfen.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      termsOfService: 'https://tofasfen.com/terms',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.tofasfen.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token ile kimlik doğrulama',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'adSoyad', 'rol'],
          properties: {
            id: {
              type: 'string',
              description: 'Kullanıcı ID',
              example: '2024001',
            },
            adSoyad: {
              type: 'string',
              description: 'Ad ve soyad',
              example: 'Ahmet Yılmaz',
            },
            rol: {
              type: 'string',
              enum: ['admin', 'teacher', 'student', 'parent', 'ziyaretci'],
              description: 'Kullanıcı rolü',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email adresi',
              example: 'ahmet.yilmaz@tofasfen.com',
            },
            sinif: {
              type: 'string',
              enum: ['9', '10', '11', '12'],
              description: 'Sınıf',
            },
            sube: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E', 'F'],
              description: 'Şube',
            },
            oda: {
              type: 'string',
              description: 'Oda numarası',
              example: '101',
            },
            pansiyon: {
              type: 'boolean',
              description: 'Pansiyonda kalıyor mu?',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['id', 'sifre'],
          properties: {
            id: {
              type: 'string',
              description: 'Kullanıcı ID',
              example: '2024001',
            },
            sifre: {
              type: 'string',
              description: 'Şifre',
              example: 'password123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Giriş başarılı',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
            expiresIn: {
              type: 'number',
              description: 'Token süresi (saniye)',
              example: 900,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Hata mesajı',
            },
            errorType: {
              type: 'string',
              enum: [
                'NETWORK',
                'AUTHENTICATION',
                'AUTHORIZATION',
                'VALIDATION',
                'SERVER',
                'CLIENT',
                'UNKNOWN',
              ],
              description: 'Hata tipi',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status kodu',
            },
          },
        },
        EvciRequest: {
          type: 'object',
          required: ['studentId', 'startDate', 'endDate', 'destination'],
          properties: {
            studentId: {
              type: 'string',
              description: 'Öğrenci ID',
              example: '2024001',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Başlangıç tarihi',
              example: '2024-01-15',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Bitiş tarihi',
              example: '2024-01-17',
            },
            destination: {
              type: 'string',
              description: 'Gidilecek yer',
              example: 'Ankara',
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              description: 'Durum',
              example: 'pending',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Kimlik doğrulama gerekli',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Token gerekli',
                errorType: 'AUTHENTICATION',
                statusCode: 401,
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Yetki yetersiz',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Bu işlem için yetkiniz yok',
                errorType: 'AUTHORIZATION',
                statusCode: 403,
              },
            },
          },
        },
        ValidationError: {
          description: 'Geçersiz istek',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Geçersiz veri',
                errorType: 'VALIDATION',
                statusCode: 400,
              },
            },
          },
        },
        NotFoundError: {
          description: 'Kaynak bulunamadı',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Kaynak bulunamadı',
                errorType: 'CLIENT',
                statusCode: 404,
              },
            },
          },
        },
        ServerError: {
          description: 'Sunucu hatası',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Sunucu hatası',
                errorType: 'SERVER',
                statusCode: 500,
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/modules/*/routes/*.ts', './src/modules/*/controllers/*.ts'],
};

export const specs = swaggerJsdoc(options);

export const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .scheme-container { background: #f9fafb; }
  `,
  customSiteTitle: 'Tofas Fen Webapp API',
  customfavIcon: '/favicon.ico',
};

export const setupSwagger = (app: Express) => {
  // @types/swagger-ui-express depends on @types/express@5 while server pins
  // @types/express@4 — cast handlers to the local express RequestHandler so
  // app.use overloads resolve.
  const serveHandlers = swaggerUi.serve as unknown as RequestHandler[];
  const setupHandler = swaggerUi.setup(specs, swaggerOptions) as unknown as RequestHandler;
  app.use('/api-docs', ...serveHandlers, setupHandler);

  // JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};
