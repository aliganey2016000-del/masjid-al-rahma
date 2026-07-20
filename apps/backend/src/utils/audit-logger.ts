/**
 * Audit Logging System
 *
 * Tracks all administrative actions and sensitive operations
 * for compliance, security, and accountability purposes.
 */

import { Request, Response, NextFunction } from 'express';
import { Document, Schema, model } from 'mongoose';

/**
 * Audit log document interface
 */
export interface IAuditLog extends Document {
  userId: string;
  userName?: string;
  action: string; // e.g., 'CREATE_USER', 'DELETE_PAYMENT', 'UPDATE_COURSE'
  resource: string; // e.g., 'User', 'Payment', 'Course'
  resourceId: string;
  resourceName?: string;
  organizationId?: string;
  method: string; // HTTP method
  endpoint: string;
  statusCode: number;
  changes?: Record<string, any>; // Old vs new values
  details?: Record<string, any>; // Additional context
  ip: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

/**
 * Audit log schema
 */
const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: String,
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    resourceName: String,
    organizationId: {
      type: String,
      index: true,
    },
    method: String,
    endpoint: String,
    statusCode: Number,
    changes: Schema.Types.Mixed,
    details: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'auditLogs',
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, timestamp: -1 });

/**
 * Audit log model
 */
export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);

/**
 * Actions that should be audited
 */
export const AUDITED_ACTIONS = {
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',

  // Password changes
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Payment
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_STATUS_CHANGED: 'PAYMENT_STATUS_CHANGED',
  BULK_CHARGE: 'BULK_CHARGE',

  // Course management
  COURSE_CREATED: 'COURSE_CREATED',
  COURSE_UPDATED: 'COURSE_UPDATED',
  COURSE_DELETED: 'COURSE_DELETED',
  COURSE_PUBLISHED: 'COURSE_PUBLISHED',

  // Exam management
  EXAM_CREATED: 'EXAM_CREATED',
  EXAM_DELETED: 'EXAM_DELETED',
  EXAM_GRADED: 'EXAM_GRADED',

  // System
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  LOGS_CLEARED: 'LOGS_CLEARED',
  BACKUP_CREATED: 'BACKUP_CREATED',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
};

/**
 * Audit logger class
 */
export class AuditLogger {
  /**
   * Log an action
   */
  static async logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    req: Request,
    options?: {
      resourceName?: string;
      changes?: Record<string, any>;
      details?: Record<string, any>;
      severity?: 'info' | 'warning' | 'critical';
      organizationId?: string;
    }
  ): Promise<IAuditLog> {
    const severity = this.getSeverity(action);

    const auditLog = await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      organizationId: options?.organizationId,
      method: req.method,
      endpoint: req.path,
      statusCode: 200,
      changes: options?.changes,
      details: options?.details,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity: options?.severity || severity,
      resourceName: options?.resourceName,
      timestamp: new Date(),
    });

    return auditLog;
  }

  /**
   * Determine severity level based on action
   */
  private static getSeverity(action: string): 'info' | 'warning' | 'critical' {
    const critical = ['USER_DELETED', 'LOGS_CLEARED', 'API_KEY_REVOKED'];
    const warning = ['USER_DEACTIVATED', 'PASSWORD_RESET', 'PAYMENT_DELETED'];

    if (critical.includes(action)) return 'critical';
    if (warning.includes(action)) return 'warning';
    return 'info';
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLog(userId: string, limit: number = 50) {
    return await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get audit logs for a resource
   */
  static async getResourceAuditLog(resource: string, resourceId: string) {
    return await AuditLog.find({ resource, resourceId })
      .sort({ timestamp: -1 });
  }

  /**
   * Get critical audit logs
   */
  static async getCriticalLogs(days: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await AuditLog.find({
      severity: 'critical',
      timestamp: { $gte: cutoffDate },
    }).sort({ timestamp: -1 });
  }

  /**
   * Get audit log summary for organization
   */
  static async getOrganizationSummary(organizationId: string, days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await AuditLog.find({
      organizationId,
      timestamp: { $gte: cutoffDate },
    });

    const summary = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      bySeverity: { info: 0, warning: 0, critical: 0 },
      byResource: {} as Record<string, number>,
      topUsers: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      summary.bySeverity[log.severity]++;
      summary.byResource[log.resource] = (summary.byResource[log.resource] || 0) + 1;
      summary.topUsers[log.userId] = (summary.topUsers[log.userId] || 0) + 1;
    });

    return summary;
  }

  /**
   * Export audit logs
   */
  static async exportLogs(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const query: Record<string, any> = {
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (organizationId) {
      query.organizationId = organizationId;
    }

    const logs = await AuditLog.find(query).sort({ timestamp: -1 });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV export
    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Resource',
      'Resource ID',
      'Status',
      'IP Address',
      'Severity',
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.userId,
      log.action,
      log.resource,
      log.resourceId,
      log.statusCode,
      log.ip,
      log.severity,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Clean old audit logs
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }
}

/**
 * Audit logging middleware factory
 * Automatically logs specific routes based on configuration
 */
export function auditLoggingMiddleware(
  action: string,
  resource: string,
  resourceIdField: string = 'id'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any) {
      const resourceId = req.params[resourceIdField] || req.body?.id || 'N/A';

      // Only log successful operations
      if (res.statusCode < 400) {
        AuditLogger.logAction(
          (req as any).user?.userId || 'system',
          action,
          resource,
          resourceId,
          req,
          {
            organizationId: (req as any).user?.organizationId,
            details: {
              body: (req as any).body,
              query: req.query,
            },
          }
        ).catch((error) => {
          console.error('Failed to log audit:', error);
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Helper to detect changes in update operations
 */
export function detectChanges(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, any> {
  const changes: Record<string, any> = {};

  Object.keys(newValues).forEach((key) => {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes[key] = {
        old: oldValues[key],
        new: newValues[key],
      };
    }
  });

  return changes;
}
