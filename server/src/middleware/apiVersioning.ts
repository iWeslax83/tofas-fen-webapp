/**
 * API Versioning Middleware
 * Handle API versioning and backward compatibility
 */

import { Request, Response, NextFunction } from 'express';

const CURRENT_API_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

export interface VersionedRequest extends Request {
  apiVersion?: string;
}

export function apiVersioningMiddleware(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
) {
  // Extract version from header or query parameter
  const versionHeader = req.headers['api-version'] as string;
  const versionQuery = req.query.version as string;
  const version = versionHeader || versionQuery || CURRENT_API_VERSION;

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      message: `API version ${version} is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      supportedVersions: SUPPORTED_VERSIONS,
      currentVersion: CURRENT_API_VERSION,
    });
  }

  // Attach version to request
  req.apiVersion = version;

  // Add version to response headers
  res.setHeader('API-Version', version);
  res.setHeader('API-Current-Version', CURRENT_API_VERSION);

  next();
}

/**
 * Deprecation warning middleware
 */
export function deprecationWarningMiddleware(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
) {
  // Check if endpoint is deprecated
  const deprecatedEndpoints: Record<string, { deprecatedSince: string; removedIn?: string; alternative?: string }> = {
    // Example: '/api/old-endpoint': { deprecatedSince: '2024-01-01', removedIn: '2024-07-01', alternative: '/api/new-endpoint' }
  };

  const endpoint = req.path;
  const deprecationInfo = deprecatedEndpoints[endpoint];

  if (deprecationInfo) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Deprecation-Date', deprecationInfo.deprecatedSince);
    
    if (deprecationInfo.removedIn) {
      res.setHeader('Sunset', deprecationInfo.removedIn);
    }
    
    if (deprecationInfo.alternative) {
      res.setHeader('Link', `<${deprecationInfo.alternative}>; rel="alternate"`);
    }

    // Log deprecation warning
    console.warn(`[DEPRECATED] ${req.method} ${endpoint} - Deprecated since ${deprecationInfo.deprecatedSince}`);
  }

  next();
}

