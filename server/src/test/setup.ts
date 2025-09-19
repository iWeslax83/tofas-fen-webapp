import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Test database connection
let testDbConnection: typeof mongoose | null = null;

// Global test timeout
beforeAll(async () => {
  // Set up test database connection
  console.log('🧪 Setting up test environment...');
  console.log(`📊 Test database: ${process.env.MONGODB_URI}`);
  console.log(`🔑 JWT secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`🗄️ Redis URL: ${process.env.REDIS_URL}`);
  
  try {
    // Connect to test database
    testDbConnection = await mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: 1,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test database
    if (testDbConnection) {
      await testDbConnection.connection.db.dropDatabase();
      await testDbConnection.connection.close();
      console.log('✅ Test database cleaned and closed');
    }
  } catch (error) {
    console.error('❌ Error cleaning up test database:', error);
  }
  
  // Clean up any global test state
  global.gc && global.gc();
}, 10000);

// Clean up between tests
beforeEach(async () => {
  // Clear all collections before each test
  if (testDbConnection) {
    const collections = await testDbConnection.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterEach(async () => {
  // Additional cleanup if needed
});

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adSoyad: 'Test User',
    email: `test_${Date.now()}@example.com`,
    rol: 'student',
    sinif: '10',
    sube: 'A',
    ...overrides
  }),

  // Generate test homework data
  generateTestHomework: (overrides = {}) => ({
    title: 'Test Homework',
    description: 'This is a test homework description',
    subject: 'Matematik',
    classLevel: '10',
    classSection: 'A',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    ...overrides
  }),

  // Generate test note data
  generateTestNote: (overrides = {}) => ({
    studentId: `student_${Date.now()}`,
    lesson: 'Matematik',
    note: 85,
    date: new Date().toISOString(),
    semester: '1',
    academicYear: 2024,
    ...overrides
  }),

  // Generate test announcement data
  generateTestAnnouncement: (overrides = {}) => ({
    title: 'Test Announcement',
    content: 'This is a test announcement content',
    priority: 'normal',
    targetRoles: ['student', 'teacher'],
    targetClasses: ['10', '11'],
    ...overrides
  }),

  // Generate test club data
  generateTestClub: (overrides = {}) => ({
    name: 'Test Club',
    description: 'This is a test club description',
    category: 'academic',
    maxMembers: 20,
    isPublic: true,
    tags: ['test', 'academic'],
    ...overrides
  }),

  // Generate test meal list data
  generateTestMealList: (overrides = {}) => ({
    date: new Date().toISOString().split('T')[0],
    meals: [
      {
        type: 'breakfast',
        time: '07:00',
        menu: ['Bread', 'Butter', 'Jam', 'Tea']
      },
      {
        type: 'lunch',
        time: '12:00',
        menu: ['Rice', 'Chicken', 'Salad', 'Soup']
      }
    ],
    notes: 'Test meal list notes',
    ...overrides
  }),

  // Generate test supervisor list data
  generateTestSupervisorList: (overrides = {}) => ({
    date: new Date().toISOString().split('T')[0],
    supervisors: [
      {
        userId: `supervisor_${Date.now()}`,
        shift: 'morning',
        area: 'Block A',
        startTime: '08:00',
        endTime: '16:00'
      }
    ],
    ...overrides
  }),

  // Generate test maintenance request data
  generateTestMaintenanceRequest: (overrides = {}) => ({
    title: 'Test Maintenance Request',
    description: 'This is a test maintenance request description',
    category: 'electrical',
    priority: 'medium',
    location: 'Room 101',
    estimatedCost: 500,
    ...overrides
  }),

  // Generate test evci request data
  generateTestEvciRequest: (overrides = {}) => ({
    studentId: `student_${Date.now()}`,
    reason: 'Family visit',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    destination: 'Home',
    contactPhone: '+905551234567',
    emergencyContact: 'Parent',
    ...overrides
  }),

  // Generate test request data
  generateTestRequestData: (overrides = {}) => ({
    type: 'general',
    title: 'Test Request',
    description: 'This is a test request description',
    priority: 'normal',
    ...overrides
  }),

  // Wait for a specified time (useful for testing async operations)
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate random email
  randomEmail: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,

  // Generate random phone number
  randomPhone: () => `+90${Math.floor(Math.random() * 900000000) + 100000000}`,

  // Generate random date in the future
  randomFutureDate: (daysFromNow: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  },

  // Generate random date in the past
  randomPastDate: (daysAgo: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  },

  // Generate random integer between min and max
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Generate random float between min and max
  randomFloat: (min: number, max: number) => Math.random() * (max - min) + min,

  // Generate random boolean
  randomBoolean: () => Math.random() > 0.5,

  // Generate random array element
  randomElement: <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)],

  // Generate random subset of array
  randomSubset: <T>(array: T[], count: number): T[] => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  // Clean up test data
  cleanupTestData: async (collections: string[]) => {
    // This would be implemented based on your database setup
    console.log(`🧹 Cleaning up test data for collections: ${collections.join(', ')}`);
  }
};

// Extend global types
declare global {
  var testUtils: any;
}

// Export test utilities for use in tests
export { testUtils };

