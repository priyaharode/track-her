import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Extended Express Request with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

/**
 * Middleware: Authenticate user via JWT token
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      logger.warn('Missing or invalid authorization header');
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token'
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    logger.debug(`User ${decoded.userId} authenticated successfully`);
    next();
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Authentication error:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Token has expired'
        });
        return;
      }
      
      if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid token'
        });
        return;
      }
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};