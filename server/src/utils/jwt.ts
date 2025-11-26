import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { tokenBlacklist } from './tokenBlacklist';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
}

export interface JWTPayload {
  userId: string;
  role: string;
  email?: string | undefined;
  iat?: number; // Issued at
  exp?: number; // Expires at
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number; // Issued at
  exp?: number; // Expires at
}

// Generate access token (short-lived)
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '15m',
    issuer: 'tofas-fen-webapp',
    audience: 'tofas-fen-users'
  });
};

// Generate refresh token (long-lived)
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: '7d', // Reduced from 28d for better security
    issuer: 'tofas-fen-webapp',
    audience: 'tofas-fen-users'
  });
};

// Verify access token
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'tofas-fen-webapp',
      audience: 'tofas-fen-users'
    }) as JWTPayload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'tofas-fen-webapp',
      audience: 'tofas-fen-users'
    }) as RefreshTokenPayload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

// JWT Authentication Middleware with blacklist check
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }

    // Add user info to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Generate token pair with enhanced security
export const generateTokenPair = (userId: string, role: string, email?: string, tokenVersion: number = 0) => {
  const accessToken = generateAccessToken({ userId, role, email });
  const refreshToken = generateRefreshToken({ userId, tokenVersion });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    refreshExpiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    tokenVersion // Include token version for validation
  };
};

// Token refresh function
export const refreshTokens = async (refreshToken: string, tokenVersion: number) => {
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    throw new Error('Invalid refresh token');
  }

  // Check if token version matches (for token invalidation)
  if (payload.tokenVersion !== tokenVersion) {
    throw new Error('Token version mismatch');
  }

  // Generate new token pair
  return generateTokenPair(payload.userId, '', '', tokenVersion);
};

// Logout function with token blacklisting
export const logoutUser = async (accessToken: string, refreshToken: string): Promise<void> => {
  try {
    // Decode tokens to get expiration times
    const accessPayload = verifyAccessToken(accessToken);
    const refreshPayload = verifyRefreshToken(refreshToken);

    // Add tokens to blacklist
    if (accessPayload && accessPayload.exp) {
      await tokenBlacklist.addToBlacklist(accessToken, accessPayload.exp * 1000);
    }

    if (refreshPayload && refreshPayload.exp) {
      await tokenBlacklist.addToBlacklist(refreshToken, refreshPayload.exp * 1000);
    }
  } catch (error) {
    console.error('Error during logout token blacklisting:', error);
    // Don't throw error to prevent logout failure
  }
};

// Revoke all user tokens (for security purposes)
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  try {
    // This would require storing active tokens per user
    // For now, we'll implement a simple version
    // In production, you might want to store active tokens in Redis
    console.log(`Revoking all tokens for user: ${userId}`);
  } catch (error) {
    console.error('Error revoking user tokens:', error);
  }
};