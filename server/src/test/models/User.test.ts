import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { User, IUser } from '../../models/User';

// Test database setup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tofas-fen-test';

describe('User Model', () => {
  beforeEach(async () => {
    await mongoose.connect(MONGODB_URI);
    await User.deleteMany({});
  });

  afterEach(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('User Creation', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.id).toBe('user123');
      expect(savedUser.adSoyad).toBe('John Doe');
      expect(savedUser.rol).toBe('student');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should create a user with optional fields', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student',
        email: 'john@example.com',
        sinif: '9A',
        sube: 'A',
        oda: '101',
        pansiyon: true
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('john@example.com');
      expect(savedUser.sinif).toBe('9A');
      expect(savedUser.sube).toBe('A');
      expect(savedUser.oda).toBe('101');
      expect(savedUser.pansiyon).toBe(true);
    });

    it('should require id field', async () => {
      const userData = {
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should require adSoyad field', async () => {
      const userData = {
        id: 'user123',
        sifre: 'hashedPassword',
        rol: 'student'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should require rol field', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Validation', () => {
    it('should validate email format', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student',
        email: 'invalid-email'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should accept valid email format', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student',
        email: 'john@example.com'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.email).toBe('john@example.com');
    });

    it('should validate role enum values', async () => {
      const validRoles = ['admin', 'teacher', 'student', 'parent', 'hizmetli'];
      
      for (const role of validRoles) {
        const userData = {
          id: `user${role}`,
          adSoyad: 'John Doe',
          sifre: 'hashedPassword',
          rol: role
        };

        const user = new User(userData);
        const savedUser = await user.save();
        
        expect(savedUser.rol).toBe(role);
      }
    });

    it('should reject invalid role values', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'invalid-role'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Create test users
      const users = [
        {
          id: 'admin1',
          adSoyad: 'Admin User',
          sifre: 'hashedPassword',
          rol: 'admin',
          email: 'admin@example.com'
        },
        {
          id: 'teacher1',
          adSoyad: 'Teacher User',
          sifre: 'hashedPassword',
          rol: 'teacher',
          sinif: '9A',
          sube: 'A'
        },
        {
          id: 'student1',
          adSoyad: 'Student User',
          sifre: 'hashedPassword',
          rol: 'student',
          sinif: '9A',
          sube: 'A',
          pansiyon: true
        },
        {
          id: 'student2',
          adSoyad: 'Student User 2',
          sifre: 'hashedPassword',
          rol: 'student',
          sinif: '9B',
          sube: 'B',
          pansiyon: false
        }
      ];

      await User.insertMany(users);
    });

    it('should find users by role', async () => {
      const students = await User.find({ rol: 'student' });
      expect(students).toHaveLength(2);
      
      const teachers = await User.find({ rol: 'teacher' });
      expect(teachers).toHaveLength(1);
    });

    it('should find users by class and section', async () => {
      const class9A = await User.find({ sinif: '9A', sube: 'A' });
      expect(class9A).toHaveLength(1);
      expect(class9A[0].id).toBe('student1');
    });

    it('should find users by dormitory status', async () => {
      const dormitoryUsers = await User.find({ pansiyon: true });
      expect(dormitoryUsers).toHaveLength(1);
      expect(dormitoryUsers[0].id).toBe('student1');
    });

    it('should find active users', async () => {
      const activeUsers = await User.find({ isActive: true });
      expect(activeUsers).toHaveLength(4);
    });
  });

  describe('User Indexes', () => {
    it('should have compound index on role and isActive', async () => {
      const indexes = await User.collection.getIndexes();
      const compoundIndex = Object.values(indexes).find(
        (index: any) => 
          index.key && 
          index.key.rol === 1 && 
          index.key.isActive === 1
      );
      
      expect(compoundIndex).toBeDefined();
    });

    it('should have text index on adSoyad and email', async () => {
      const indexes = await User.collection.getIndexes();
      const textIndex = Object.values(indexes).find(
        (index: any) => 
          index.textIndexVersion !== undefined
      );
      
      expect(textIndex).toBeDefined();
    });
  });

  describe('User Virtuals', () => {
    it('should return full name from adSoyad', async () => {
      const userData = {
        id: 'user123',
        adSoyad: 'John Doe',
        sifre: 'hashedPassword',
        rol: 'student'
      };

      const user = new User(userData);
      expect(user.fullName).toBe('John Doe');
    });
  });
});
