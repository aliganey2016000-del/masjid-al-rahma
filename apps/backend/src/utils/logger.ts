/**
 * Advanced Request/Response Logging System
 *
 * Comprehensive logging for monitoring, debugging, and security auditing.
 * Logs are structured and can be integrated with centralized logging services
 * like ELK Stack, Splunk, CloudWatch, or Datadog.
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  type: 'REQUEST' | 'RESPONSE' | 'ERROR' | 'SECURITY' | 'PERFORMANCE';
  method: string;
  path: string;
  statusCode?: number;
  duration?: number; // milliseconds
  userId?: string;
  role?: string;
  ip: string;
  userAgent?: string;
  message: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  error?: string;
  securityEvents?: string[];
}

/**
 * Logger class for handling all logging operations
 */
export class SecurityLogger {
  private logDir: string;
  private environment: string;
  private shouldLogBodies: boolean;

  constructor(
    logDir: string = './logs',
    environment: string = process.env.NODE_ENV || 'development',
    shouldLogBodies: boolean = false
  ) {
    this.logDir = logDir;
    this.environment = environment;
    this.shouldLogBodies = shouldLogBodies && environment !== 'production';

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log entry to file and console
   */
  private writeLog(entry: LogEntry): void {
    const logMessage = JSON.stringify(entry);

    // Console output (formatted for development)
    if (this.environment === 'development') {
      const color = this.getColorForLevel(entry.level);
      console.log(`${color}[${entry.level}]${'\x1b[0m'} ${entry.message}`, {
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        duration: entry.duration ? `${entry.duration}ms` : undefined,
      });
    }

    // File output (JSON for structured logging)
    const logFile = path.join(
      this.logDir,
      `${entry.level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`
    );

    try {
      fs.appendFileSync(logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  /**
   * Get ANSI color for log level
   */
  private getColorForLevel(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
    };
    return colors[level] || '';
  }

  /**
   * Log request
   */
  logRequest(req: Request): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      type: 'REQUEST',
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.userId,
      role: (req as any).user?.role,
      message: `${req.method} ${req.path}`,
    };

    if (this.shouldLogBodies && req.body && req.method !== 'GET') {
      // Don't log sensitive fields
      const safebody = this.sanitizeBody(req.body);
      entry.requestBody = safebody;
    }

    this.writeLog(entry);
  }

  /**
   * Log response
   */
  logResponse(
    req: Request,
    statusCode: number,
    duration: number,
    responseSize?: number
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO,
      type: 'RESPONSE',
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: (req as any).user?.userId,
      role: (req as any).user?.role,
      message: `${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
    };

    this.writeLog(entry);
  }

  /**
   * Log error
   */
  logError(req: Request, error: Error, statusCode: number = 500): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? LogLevel.CRITICAL : LogLevel.ERROR,
      type: 'ERROR',
      method: req.method,
      path: req.path,
      statusCode,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: (req as any).user?.userId,
      role: (req as any).user?.role,
      message: `Error in ${req.method} ${req.path}`,
      error: error.message,
    };

    this.writeLog(entry);
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    req: Request,
    eventType: string,
    details: Record<string, any> = {}
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      type: 'SECURITY',
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: (req as any).user?.userId,
      role: (req as any).user?.role,
      message: `Security event: ${eventType}`,
      securityEvents: [JSON.stringify(details)],
    };

    this.writeLog(entry);
  }

  /**
   * Sanitize request body to remove sensitive fields
   */
  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'pin',
    ];

    const sanitized = { ...body };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Clean old log files
   */
  cleanOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.logDir);

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stat = fs.statSync(filePath);

        if (stat.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }

    return deletedCount;
  }

  /**
   * Get log statistics for a specific date
   */
  getLogStats(date: Date = new Date()): Record<string, number> {
    const dateStr = date.toISOString().split('T')[0];
    const stats: Record<string, number> = {
      total: 0,
      requests: 0,
      responses: 0,
      errors: 0,
      security_events: 0,
    };

    Object.values(LogLevel).forEach((level) => {
      const logFile = path.join(this.logDir, `${level.toLowerCase()}-${dateStr}.log`);

      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf-8');
          const lines = content.split('\n').filter((line) => line.trim());

          stats.total += lines.length;

          lines.forEach((line) => {
            try {
              const entry = JSON.parse(line) as LogEntry;
              switch (entry.type) {
                case 'REQUEST':
                  stats.requests++;
                  break;
                case 'RESPONSE':
                  stats.responses++;
                  break;
                case 'ERROR':
                  stats.errors++;
                  break;
                case 'SECURITY':
                  stats.security_events++;
                  break;
              }
            } catch {
              // Skip unparseable lines
            }
          });
        } catch (error) {
          console.error(`Error reading log file ${logFile}:`, error);
        }
      }
    });

    return stats;
  }
}

/**
 * Global logger instance
 */
let logger: SecurityLogger | null = null;

/**
 * Initialize logger
 */
export function initializeLogger(
  logDir: string = process.env.LOG_DIR || './logs',
  environment: string = process.env.NODE_ENV || 'development'
): SecurityLogger {
  if (!logger) {
    logger = new SecurityLogger(logDir, environment, false); // Don't log bodies in production
  }
  return logger;
}

/**
 * Get logger instance
 */
export function getLogger(): SecurityLogger {
  if (!logger) {
    logger = initializeLogger();
  }
  return logger;
}

/**
 * Middleware for request/response logging
 */
export function requestResponseLoggingMiddleware() {
  const logger = getLogger();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip health check logging to reduce noise
    if (req.path === '/api/v1/health') {
      return next();
    }

    // Log request
    logger.logRequest(req);

    // Record start time for performance tracking
    const startTime = Date.now();

    // Capture original res.json and res.send
    const originalJson = res.json;
    const originalSend = res.send;

    // Override res.json
    res.json = function (data: any) {
      const duration = Date.now() - startTime;
      logger.logResponse(req, res.statusCode, duration);
      return originalJson.call(this, data);
    };

    // Override res.send
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      logger.logResponse(req, res.statusCode, duration);
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Security event logging helper
 */
export function logSecurityAlert(
  req: Request,
  eventType: string,
  details: Record<string, any> = {}
): void {
  const logger = getLogger();
  logger.logSecurityEvent(req, eventType, details);
}

/**
 * Performance monitoring helper
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  status: 'success' | 'failure';
}

export function logPerformance(operation: string, duration: number, status: 'success' | 'failure' = 'success'): void {
  const metrics: PerformanceMetrics = {
    operation,
    duration,
    timestamp: new Date(),
    status,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️  ${operation}: ${duration}ms [${status}]`);
  }
}
