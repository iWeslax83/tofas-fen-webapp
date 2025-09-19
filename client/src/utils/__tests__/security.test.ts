import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenManager, InputSanitizer, PasswordPolicy, XSSProtection, CSRFProtection, RateLimiter } from '../security'

describe('TokenManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should set and get tokens', () => {
    const accessToken = 'test-access-token'
    const refreshToken = 'test-refresh-token'
    const expiresIn = 3600

    TokenManager.setTokens(accessToken, refreshToken, expiresIn)

    expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', accessToken)
    expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', refreshToken)
    expect(localStorage.setItem).toHaveBeenCalledWith('token_expiry', expect.any(String))
  })

  it('should get access token', () => {
    const token = 'test-token'
    vi.mocked(localStorage.getItem).mockReturnValue(token)

    const result = TokenManager.getAccessToken()

    expect(result).toBe(token)
    expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
  })

  it('should check if token is expired', () => {
    const futureTime = Date.now() + 3600000 // 1 hour from now
    vi.mocked(localStorage.getItem).mockReturnValue(futureTime.toString())

    const result = TokenManager.isTokenExpired()

    expect(result).toBe(false)
  })

  it('should clear tokens', () => {
    TokenManager.clearTokens()

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('token_expiry')
  })
})

describe('InputSanitizer', () => {
  it('should sanitize string input', () => {
    const input = '<script>alert("xss")</script>Hello World'
    const result = InputSanitizer.sanitizeString(input)

    expect(result).toBe('Hello World')
  })

  it('should sanitize object', () => {
    const input = {
      name: '<script>alert("xss")</script>John',
      email: 'john@example.com',
      message: '<img src="x" onerror="alert(1)">Hello'
    }

    const result = InputSanitizer.sanitizeObject(input)

    expect(result.name).toBe('John')
    expect(result.email).toBe('john@example.com')
    expect(result.message).toBe('Hello')
  })

  it('should handle null and undefined', () => {
    expect(InputSanitizer.sanitizeString(null as any)).toBe('')
    expect(InputSanitizer.sanitizeString(undefined as any)).toBe('')
  })
})

describe('PasswordPolicy', () => {
  it('should validate strong password', () => {
    const password = 'StrongPass123!'
    const result = PasswordPolicy.validate(password)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject weak password', () => {
    const password = 'weak'
    const result = PasswordPolicy.validate(password)

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should check password strength', () => {
    const weakPassword = 'weak'
    const mediumPassword = 'MediumPass123'
    const strongPassword = 'StrongPass123!'

    expect(PasswordPolicy.getStrength(weakPassword)).toBe('weak')
    expect(PasswordPolicy.getStrength(mediumPassword)).toBe('medium')
    expect(PasswordPolicy.getStrength(strongPassword)).toBe('strong')
  })
})

describe('XSSProtection', () => {
  it('should escape HTML', () => {
    const input = '<script>alert("xss")</script>'
    const result = XSSProtection.escapeHtml(input)

    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).not.toContain('<script>')
  })

  it('should sanitize HTML', () => {
    const input = '<p>Hello <script>alert("xss")</script> World</p>'
    const result = XSSProtection.sanitizeHtml(input)

    expect(result).toBe('<p>Hello  World</p>')
  })
})

describe('CSRFProtection', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('should generate and store CSRF token', () => {
    const token = CSRFProtection.generateToken()

    expect(token).toBeDefined()
    expect(sessionStorage.setItem).toHaveBeenCalledWith('csrf_token', token)
  })

  it('should get stored CSRF token', () => {
    const token = 'test-csrf-token'
    vi.mocked(sessionStorage.getItem).mockReturnValue(token)

    const result = CSRFProtection.getToken()

    expect(result).toBe(token)
  })

  it('should validate CSRF token', () => {
    const token = 'test-csrf-token'
    vi.mocked(sessionStorage.getItem).mockReturnValue(token)

    const result = CSRFProtection.validateToken(token)

    expect(result).toBe(true)
  })
})

describe('RateLimiter', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should allow request within limit', () => {
    const key = 'test-key'
    const limit = 5
    const windowMs = 60000

    for (let i = 0; i < 3; i++) {
      const result = RateLimiter.checkLimit(key, limit, windowMs)
      expect(result.allowed).toBe(true)
    }
  })

  it('should block request over limit', () => {
    const key = 'test-key'
    const limit = 2
    const windowMs = 60000

    // First two requests should be allowed
    expect(RateLimiter.checkLimit(key, limit, windowMs).allowed).toBe(true)
    expect(RateLimiter.checkLimit(key, limit, windowMs).allowed).toBe(true)

    // Third request should be blocked
    const result = RateLimiter.checkLimit(key, limit, windowMs)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})