import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureAPI } from '../../utils/api';

// Mock axios
const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: mockAxios,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SecureAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('get', () => {
    it('should make GET request with authorization header', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await SecureAPI.get('/test');

      expect(mockAxios.get).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle GET request without token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const mockResponse = { data: { id: 1, name: 'Test' } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await SecureAPI.get('/test');

      expect(mockAxios.get).toHaveBeenCalledWith('/test', {
        headers: {},
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle GET request error', async () => {
      const mockError = new Error('Network error');
      mockAxios.get.mockRejectedValue(mockError);

      await expect(SecureAPI.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make POST request with authorization header', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      const requestData = { name: 'Test' };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await SecureAPI.post('/test', requestData);

      expect(mockAxios.post).toHaveBeenCalledWith('/test', requestData, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle POST request error', async () => {
      const mockError = new Error('Network error');
      mockAxios.post.mockRejectedValue(mockError);

      await expect(SecureAPI.post('/test', {})).rejects.toThrow('Network error');
    });
  });

  describe('put', () => {
    it('should make PUT request with authorization header', async () => {
      const mockResponse = { data: { id: 1, name: 'Updated' } };
      const requestData = { name: 'Updated' };
      mockAxios.put.mockResolvedValue(mockResponse);

      const result = await SecureAPI.put('/test/1', requestData);

      expect(mockAxios.put).toHaveBeenCalledWith('/test/1', requestData, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle PUT request error', async () => {
      const mockError = new Error('Network error');
      mockAxios.put.mockRejectedValue(mockError);

      await expect(SecureAPI.put('/test/1', {})).rejects.toThrow('Network error');
    });
  });

  describe('delete', () => {
    it('should make DELETE request with authorization header', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.delete.mockResolvedValue(mockResponse);

      const result = await SecureAPI.delete('/test/1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/test/1', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle DELETE request error', async () => {
      const mockError = new Error('Network error');
      mockAxios.delete.mockRejectedValue(mockError);

      await expect(SecureAPI.delete('/test/1')).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user data', async () => {
      const mockUser = { id: 1, name: 'Test User', rol: 'student' };
      const mockResponse = { data: mockUser };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await SecureAPI.getCurrentUser();

      expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/me', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle getCurrentUser error', async () => {
      const mockError = new Error('Unauthorized');
      mockAxios.get.mockRejectedValue(mockError);

      await expect(SecureAPI.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('token refresh', () => {
    it('should refresh token on 401 error', async () => {
      const mockRefreshToken = 'new-refresh-token';
      const mockNewToken = 'new-access-token';
      
      mockLocalStorage.getItem
        .mockReturnValueOnce('old-token') // First call for original request
        .mockReturnValueOnce(mockRefreshToken) // Second call for refresh token
        .mockReturnValueOnce(mockNewToken); // Third call for retry

      const mockError = {
        response: { status: 401 },
        config: { url: '/test', method: 'get' },
      };

      const mockRefreshResponse = { data: { token: mockNewToken } };
      const mockRetryResponse = { data: { success: true } };

      mockAxios.post.mockResolvedValue(mockRefreshResponse);
      mockAxios.get
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockRetryResponse);

      const result = await SecureAPI.get('/test');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken: mockRefreshToken,
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockNewToken);
      expect(result).toEqual(mockRetryResponse.data);
    });
  });
});
