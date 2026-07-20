/**
 * API Security Audit Utility
 *
 * Helper functions for auditing and testing API security.
 * Use these to verify routes are properly protected.
 */

import { Router, Request, Response } from 'express';

/**
 * Route Security Info
 */
export interface RouteSecurityInfo {
  method: string;
  path: string;
  hasAuth: boolean;
  hasRoleCheck: boolean;
  hasValidation: boolean;
  isPublic: boolean;
  middlewares: string[];
  risk: 'critical' | 'high' | 'medium' | 'low' | 'safe';
}

/**
 * Get all routes from an Express app
 */
export function getRoutes(router: Router): RouteSecurityInfo[] {
  const routes: RouteSecurityInfo[] = [];

  const stack = (router as any).stack;
  if (!stack) return routes;

  stack.forEach((middleware: any) => {
    if (middleware.route) {
      // It's a route
      const methods = Object.keys(middleware.route.methods);
      methods.forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
          hasAuth: false,
          hasRoleCheck: false,
          hasValidation: false,
          isPublic: false,
          middlewares: [],
          risk: 'high',
        });
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // It's a nested router
      middleware.handle.stack.forEach((nestedMiddleware: any) => {
        if (nestedMiddleware.route) {
          const methods = Object.keys(nestedMiddleware.route.methods);
          methods.forEach((method) => {
            routes.push({
              method: method.toUpperCase(),
              path: middleware.regexp.source.replace(/[?$^]/g, '') + nestedMiddleware.route.path,
              hasAuth: false,
              hasRoleCheck: false,
              hasValidation: false,
              isPublic: false,
              middlewares: [],
              risk: 'high',
            });
          });
        }
      });
    }
  });

  return routes;
}

/**
 * Check if middleware name includes auth
 */
export function isAuthMiddleware(middlewareName: string): boolean {
  return (
    middlewareName.toLowerCase().includes('auth') ||
    middlewareName.toLowerCase().includes('jwt') ||
    middlewareName.toLowerCase().includes('verify')
  );
}

/**
 * Check if middleware name includes role check
 */
export function isRoleMiddleware(middlewareName: string): boolean {
  return (
    middlewareName.toLowerCase().includes('role') ||
    middlewareName.toLowerCase().includes('admin') ||
    middlewareName.toLowerCase().includes('permission')
  );
}

/**
 * Check if middleware name includes validation
 */
export function isValidationMiddleware(middlewareName: string): boolean {
  return (
    middlewareName.toLowerCase().includes('validate') ||
    middlewareName.toLowerCase().includes('schema') ||
    middlewareName.toLowerCase().includes('joi')
  );
}

/**
 * Assess route risk level
 */
export function assessRouteRisk(info: RouteSecurityInfo): RouteSecurityInfo['risk'] {
  if (info.isPublic) {
    // Public endpoints have lower risk if properly sanitized
    if (!info.hasValidation) return 'high';
    return 'medium';
  }

  // Protected endpoints
  if (!info.hasAuth) return 'critical';
  if (!info.hasRoleCheck && info.method !== 'GET') return 'high';
  if (!info.hasValidation && info.method !== 'GET') return 'high';

  return 'safe';
}

/**
 * Generate security audit report
 */
export function generateAuditReport(routes: RouteSecurityInfo[]): {
  total: number;
  byRisk: Record<string, number>;
  issues: RouteSecurityInfo[];
  summary: string;
} {
  const byRisk = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    safe: 0,
  };

  const issues: RouteSecurityInfo[] = [];

  routes.forEach((route) => {
    const risk = assessRouteRisk(route);
    byRisk[risk]++;

    if (['critical', 'high'].includes(risk)) {
      issues.push(route);
    }
  });

  const summary = `
Security Audit Report
=====================
Total Routes: ${routes.length}
Critical Issues: ${byRisk.critical}
High Risk: ${byRisk.high}
Medium Risk: ${byRisk.medium}
Low Risk: ${byRisk.low}
Safe: ${byRisk.safe}

${byRisk.critical > 0 ? `⚠️  CRITICAL: ${byRisk.critical} routes need immediate attention` : '✅ No critical issues'}
  `;

  return { total: routes.length, byRisk, issues, summary };
}

/**
 * Security checklist middleware
 * Returns middleware that checks request security headers
 */
export function securityHeadersCheck() {
  return (req: Request, res: Response, next: Function) => {
    const missingHeaders: string[] = [];

    if (!req.headers.authorization && !req.path.includes('/public/')) {
      missingHeaders.push('Authorization');
    }

    if (req.method !== 'GET' && !req.headers['content-type']) {
      missingHeaders.push('Content-Type');
    }

    if (missingHeaders.length > 0) {
      console.warn(`[SECURITY] Missing headers in ${req.method} ${req.path}:`, missingHeaders);
    }

    next();
  };
}

/**
 * Common public endpoints that don't require auth
 */
export const PUBLIC_ENDPOINTS = [
  /\/api\/v1\/auth\/login/i,
  /\/api\/v1\/auth\/register/i,
  /\/api\/v1\/auth\/refresh-token/i,
  /\/api\/v1\/auth\/forgot-password/i,
  /\/api\/v1\/auth\/reset-password/i,
  /\/api\/v1\/auth\/verify-email/i,
  /\/api\/v1\/health/i,
  /\/api\/v1\/tenant\/.*/i,
  /\/api\/v1\/push\/vapid-public-key/i,
];

/**
 * Check if endpoint should be public
 */
export function shouldBePublic(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((pattern) => pattern.test(path));
}

/**
 * Log security event
 */
export function logSecurityEvent(
  eventType: 'suspicious' | 'warning' | 'error' | 'success',
  message: string,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${eventType.toUpperCase()}] ${message}`;

  if (context) {
    console.log(`[${timestamp}] ${logMessage}`, JSON.stringify(context, null, 2));
  } else {
    console.log(`[${timestamp}] ${logMessage}`);
  }
}

/**
 * Endpoint security test
 */
export async function testEndpointSecurity(
  method: string,
  path: string,
  options?: {
    withAuth?: boolean;
    authToken?: string;
    data?: Record<string, any>;
  }
): Promise<{
  status: number;
  requiresAuth: boolean;
  requiresRole: boolean;
  vulnerabilities: string[];
}> {
  // This would be implemented with actual HTTP requests
  // Placeholder for testing framework integration

  return {
    status: 200,
    requiresAuth: false,
    requiresRole: false,
    vulnerabilities: [],
  };
}

/**
 * Export security report as JSON
 */
export function exportAuditReport(report: ReturnType<typeof generateAuditReport>): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      ...report,
    },
    null,
    2
  );
}
