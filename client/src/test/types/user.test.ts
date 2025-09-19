import { describe, it, expect } from 'vitest';
import { User, LoginRequest, UserResponse, UserStats, UserFilters } from '../../types/user';

describe('User Types', () => {
  describe('User interface', () => {
    it('should have required properties', () => {
      const user: User = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        sinif: '9A',
        sube: 'A',
        oda: '101',
        pansiyon: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(user.id).toBe('user123');
      expect(user.adSoyad).toBe('John Doe');
      expect(user.rol).toBe('student');
      expect(user.email).toBe('john@example.com');
      expect(user.sinif).toBe('9A');
      expect(user.sube).toBe('A');
      expect(user.oda).toBe('101');
      expect(user.pansiyon).toBe(true);
      expect(user.isActive).toBe(true);
    });

    it('should allow optional properties to be undefined', () => {
      const user: User = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'admin'
      };

      expect(user.email).toBeUndefined();
      expect(user.sinif).toBeUndefined();
      expect(user.sube).toBeUndefined();
      expect(user.oda).toBeUndefined();
      expect(user.pansiyon).toBeUndefined();
    });

    it('should accept valid role values', () => {
      const roles: User['rol'][] = ['admin', 'teacher', 'student', 'parent', 'hizmetli'];
      
      roles.forEach(role => {
        const user: User = {
          id: 'user123',
          adSoyad: 'John Doe',
          rol: role
        };
        expect(user.rol).toBe(role);
      });
    });
  });

  describe('LoginRequest interface', () => {
    it('should have required id and sifre properties', () => {
      const loginRequest: LoginRequest = {
        id: 'user123',
        sifre: 'password123'
      };

      expect(loginRequest.id).toBe('user123');
      expect(loginRequest.sifre).toBe('password123');
    });
  });

  describe('UserResponse interface', () => {
    it('should include user and token information', () => {
      const userResponse: UserResponse = {
        user: {
          id: 'user123',
          adSoyad: 'John Doe',
          rol: 'student'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800
      };

      expect(userResponse.user).toBeDefined();
      expect(userResponse.accessToken).toBe('access-token');
      expect(userResponse.refreshToken).toBe('refresh-token');
      expect(userResponse.expiresIn).toBe(900);
      expect(userResponse.refreshExpiresIn).toBe(604800);
    });
  });

  describe('UserStats interface', () => {
    it('should have statistics properties', () => {
      const userStats: UserStats = {
        totalUsers: 1000,
        usersByRole: {
          admin: 5,
          teacher: 50,
          student: 800,
          parent: 140,
          hizmetli: 5
        },
        activeUsers: 950,
        newUsersThisMonth: 25
      };

      expect(userStats.totalUsers).toBe(1000);
      expect(userStats.usersByRole.admin).toBe(5);
      expect(userStats.activeUsers).toBe(950);
      expect(userStats.newUsersThisMonth).toBe(25);
    });
  });

  describe('UserFilters interface', () => {
    it('should have optional filter properties', () => {
      const userFilters: UserFilters = {
        role: 'student',
        sinif: '9A',
        sube: 'A',
        pansiyon: true,
        isActive: true,
        search: 'john'
      };

      expect(userFilters.role).toBe('student');
      expect(userFilters.sinif).toBe('9A');
      expect(userFilters.sube).toBe('A');
      expect(userFilters.pansiyon).toBe(true);
      expect(userFilters.isActive).toBe(true);
      expect(userFilters.search).toBe('john');
    });

    it('should allow all properties to be undefined', () => {
      const userFilters: UserFilters = {};

      expect(userFilters.role).toBeUndefined();
      expect(userFilters.sinif).toBeUndefined();
      expect(userFilters.sube).toBeUndefined();
      expect(userFilters.pansiyon).toBeUndefined();
      expect(userFilters.isActive).toBeUndefined();
      expect(userFilters.search).toBeUndefined();
    });
  });
});
