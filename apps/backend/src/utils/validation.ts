/**
 * Input Validation & Sanitization Utilities
 * 
 * Provides enhanced validation and sanitization functions
 * to prevent common security vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - SQL/NoSQL Injection
 * - Path Traversal
 */

/**
 * Sanitize string input to prevent XSS
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Validate email format
 * Uses a simple regex pattern
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * Ensures URL is properly formatted
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Remove dangerous characters from filenames
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\.\./g, '') // Prevent directory traversal
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .slice(0, 255); // Limit length
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSize?: number; // bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileUpload(
  file: Express.Multer.File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = [],
    allowedExtensions = [],
  } = options;

  // Validate file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds maximum of ${maxSize} bytes` };
  }

  // Validate MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // Validate file extension
  if (allowedExtensions.length > 0) {
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return {
        valid: false,
        error: `File extension .${fileExt} is not allowed. Allowed extensions: .${allowedExtensions.join(', .')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Simple validation for international format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Rate limiting key generator
 * Generates a key for rate limiting based on request origin
 */
export function getRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req as any).user?.userId || '';
  return userId ? `${userId}:${ip}` : ip;
}

/**
 * Request interface import
 */
import { Request } from 'express';

/**
 * Sanitize object recursively
 * Removes dangerous properties from nested objects
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = { ...obj };

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  Object.keys(sanitized).forEach((key) => {
    if (dangerousKeys.includes(key)) {
      delete sanitized[key];
    } else if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  });

  return sanitized as T;
}
