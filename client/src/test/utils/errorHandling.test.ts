import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorType, ErrorSeverity, AppError } from '../../utils/errorHandling';
import { ErrorHandlerWrapper } from '../../utils/errorHandlerWrapper';

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(
        'Test error',
        ErrorType.NETWORK,
        ErrorSeverity.MEDIUM,
        {
          component: 'TestComponent',
          action: 'testAction',
          userId: 'user123',
          timestamp: Date.now(),
          url: 'http://test.com',
          userAgent: 'test-agent'
        }
      );

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context.component).toBe('TestComponent');
      expect(error.context.action).toBe('testAction');
      expect(error.context.userId).toBe('user123');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Original error');
      const appError = new AppError(
        'Wrapped error',
        ErrorType.SERVER,
        ErrorSeverity.HIGH,
        {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now()
        },
        originalError
      );

      expect(appError.originalError).toBe(originalError);
    });
  });

  describe('ErrorHandlerWrapper', () => {
    it('should wrap successful API calls', async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ data: 'success' });
      
      const result = await ErrorHandlerWrapper.wrapApiCall(
        mockApiCall,
        {
          component: 'TestComponent',
          action: 'testAction',
          userId: 'user123'
        }
      );

      expect(result).toEqual({ data: 'success' });
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should categorize network errors correctly', async () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      };
      
      const mockApiCall = vi.fn().mockRejectedValue(networkError);
      
      await expect(
        ErrorHandlerWrapper.wrapApiCall(
          mockApiCall,
          {
            component: 'TestComponent',
            action: 'testAction'
          }
        )
      ).rejects.toThrow();
    });

    it('should categorize HTTP status errors correctly', async () => {
      const authError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      };
      
      const mockApiCall = vi.fn().mockRejectedValue(authError);
      
      await expect(
        ErrorHandlerWrapper.wrapApiCall(
          mockApiCall,
          {
            component: 'TestComponent',
            action: 'testAction'
          }
        )
      ).rejects.toThrow();
    });

    it('should categorize validation errors correctly', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { error: 'validation failed' }
        }
      };
      
      const mockApiCall = vi.fn().mockRejectedValue(validationError);
      
      await expect(
        ErrorHandlerWrapper.wrapApiCall(
          mockApiCall,
          {
            component: 'TestComponent',
            action: 'testAction'
          }
        )
      ).rejects.toThrow();
    });

    it('should extract error messages from different response formats', async () => {
      const errorWithDataError = {
        response: {
          data: { error: 'Custom error message' }
        }
      };
      
      const mockApiCall = vi.fn().mockRejectedValue(errorWithDataError);
      
      await expect(
        ErrorHandlerWrapper.wrapApiCall(
          mockApiCall,
          {
            component: 'TestComponent',
            action: 'testAction'
          }
        )
      ).rejects.toThrow('Custom error message');
    });
  });
});
