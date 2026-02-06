import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureAPI } from '../../utils/api';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn().mockReturnThis(),
  };
  return {
    default: mockAxios,
    ...mockAxios
  };
});

describe('SecureAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should make GET request via apiClient', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const result = await SecureAPI.get('/test') as any;

      expect(axios.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle GET request error', async () => {
      const mockError = new Error('Network error');
      vi.mocked(axios.get).mockRejectedValue(mockError);

      await expect(SecureAPI.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make POST request via apiClient', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      const requestData = { name: 'Test' };
      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      const result = await SecureAPI.post('/test', requestData) as any;

      expect(axios.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user data via /me endpoint', async () => {
      const mockUser = { id: 1, name: 'Test User', rol: 'student' };
      const mockResponse = { data: mockUser };
      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const result = await SecureAPI.getCurrentUser() as any;

      expect(axios.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockResponse);
    });
  });
});
