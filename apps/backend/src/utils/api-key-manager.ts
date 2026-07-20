/**
 * API Key Management System
 *
 * Provides secure API key generation, validation, and management.
 * Keys are hashed in database and never exposed in logs or responses.
 */

import crypto from 'crypto';
import { Document, Schema, model } from 'mongoose';

/**
 * API Key document interface
 */
export interface IApiKey extends Document {
  name: string;
  keyHash: string; // SHA-256 hash of the actual key
  prefix: string; // First 8 characters for identification
  userId: string;
  organizationId: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  rateLimit?: number; // Requests per minute
}

/**
 * API Key schema
 */
const apiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    keyHash: {
      type: String,
      required: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
      index: true,
      maxlength: 8,
    },
    userId: {
      type: String,
      required: true,
    },
    organizationId: {
      type: String,
    },
    permissions: {
      type: [String],
      default: ['read'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    rateLimit: {
      type: Number,
      default: 100, // 100 requests per minute
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active keys by prefix
apiKeySchema.index({ prefix: 1, isActive: 1 });

/**
 * API Key model
 */
export const ApiKey = model<IApiKey>('ApiKey', apiKeySchema);

/**
 * Generated API Key response (only shown once)
 */
export interface GeneratedApiKey {
  id: string;
  name: string;
  key: string; // The actual key (shown only once)
  prefix: string;
  permissions: string[];
  expiresAt?: Date;
}

/**
 * API Key Manager
 */
export class ApiKeyManager {
  /**
   * Generate a new API key
   */
  static generateKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash an API key
   */
  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get key prefix (first 8 chars after 'sk_')
   */
  static getKeyPrefix(key: string): string {
    return key.substring(3, 11); // sk_ + next 8 chars
  }

  /**
   * Create a new API key
   */
  static async createKey(
    userId: string,
    name: string,
    permissions: string[] = ['read'],
    organizationId?: string,
    expiresInDays?: number
  ): Promise<GeneratedApiKey> {
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    const prefix = this.getKeyPrefix(key);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey = await ApiKey.create({
      name,
      keyHash,
      prefix,
      userId,
      organizationId,
      permissions,
      isActive: true,
      expiresAt,
    });

    return {
      id: apiKey._id.toString(),
      name: apiKey.name,
      key, // Only shown once
      prefix: apiKey.prefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
    };
  }

  /**
   * Validate an API key
   */
  static async validateKey(key: string): Promise<IApiKey | null> {
    if (!key || !key.startsWith('sk_')) {
      return null;
    }

    const keyHash = this.hashKey(key);
    const prefix = this.getKeyPrefix(key);

    const apiKey = await ApiKey.findOne({
      keyHash,
      prefix,
      isActive: true,
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    return apiKey;
  }

  /**
   * Check if API key has permission
   */
  static hasPermission(apiKey: IApiKey, requiredPermission: string): boolean {
    return apiKey.permissions.includes(requiredPermission) || apiKey.permissions.includes('*');
  }

  /**
   * Revoke an API key
   */
  static async revokeKey(keyId: string): Promise<boolean> {
    const result = await ApiKey.updateOne({ _id: keyId }, { isActive: false });
    return result.modifiedCount > 0;
  }

  /**
   * List all API keys for a user
   */
  static async listKeys(userId: string, organizationId?: string) {
    const query: Record<string, any> = { userId };

    if (organizationId) {
      query.organizationId = organizationId;
    }

    return await ApiKey.find(query).select('-keyHash').sort({ createdAt: -1 });
  }

  /**
   * Get key by ID
   */
  static async getKey(keyId: string) {
    return await ApiKey.findById(keyId).select('-keyHash');
  }

  /**
   * Rotate an API key (create new one, revoke old)
   */
  static async rotateKey(keyId: string, userId: string): Promise<GeneratedApiKey> {
    const oldKey = await ApiKey.findById(keyId);

    if (!oldKey || oldKey.userId.toString() !== userId) {
      throw new Error('API key not found or unauthorized');
    }

    // Revoke old key
    oldKey.isActive = false;
    await oldKey.save();

    // Create new key with same properties
    return this.createKey(
      userId,
      `${oldKey.name} (rotated)`,
      oldKey.permissions,
      oldKey.organizationId?.toString(),
      oldKey.expiresAt ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined
    );
  }

  /**
   * Clean up expired keys
   */
  static async cleanupExpiredKeys(): Promise<number> {
    const result = await ApiKey.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return result.deletedCount || 0;
  }
}

/**
 * API Key validation middleware
 */
export function apiKeyMiddleware() {
  return async (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return next(); // Let auth middleware handle it
    }

    try {
      const validKey = await ApiKeyManager.validateKey(apiKey);

      if (!validKey) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Invalid or expired API key',
          data: null,
          errors: null,
        });
      }

      // Attach API key info to request
      req.apiKey = validKey;
      req.user = {
        userId: validKey.userId.toString(),
        organizationId: validKey.organizationId?.toString(),
        permissions: validKey.permissions,
        isApiKey: true,
      };

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'API key validation failed',
        data: null,
        errors: null,
      });
    }
  };
}

/**
 * API Key permission check middleware
 */
export function apiKeyPermissionMiddleware(requiredPermission: string) {
  return (req: any, res: any, next: any) => {
    if (!req.apiKey) {
      return next(); // Not using API key
    }

    if (!ApiKeyManager.hasPermission(req.apiKey, requiredPermission)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `API key lacks required permission: ${requiredPermission}`,
        data: null,
        errors: null,
      });
    }

    next();
  };
}
