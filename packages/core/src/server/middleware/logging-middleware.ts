import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('http');

export interface LoggingOptions {
  logLevel?: 'info' | 'debug' | 'warn' | 'error';
  logBody?: boolean;
  excludePaths?: string[];
  includeHeaders?: boolean;
}

export async function setupLoggingMiddleware(
  fastify: FastifyInstance,
  options: LoggingOptions = {}
) {
  const {
    logLevel = 'info',
    logBody = false,
    excludePaths = ['/health', '/live', '/ready'],
    includeHeaders = false
  } = options;

  // Request logging hook
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return;
    }

    const logData: any = {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.id,
      timestamp: new Date().toISOString()
    };

    if (includeHeaders) {
      logData.headers = request.headers;
    }

    if (logBody && request.body) {
      // Be careful with sensitive data
      logData.body = sanitizeBody(request.body);
    }

    logger[logLevel]('Incoming request', logData);
  });

  // Response logging hook
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return payload;
    }

    const responseTime = reply.elapsedTime;
    const statusCode = reply.statusCode;

    const logData: any = {
      method: request.method,
      url: request.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: reply.getHeader('content-length'),
      requestId: request.id,
      timestamp: new Date().toISOString()
    };

    // Log level based on status code
    if (statusCode >= 500) {
      logger.error('Response sent', logData);
    } else if (statusCode >= 400) {
      logger.warn('Response sent', logData);
    } else {
      logger[logLevel]('Response sent', logData);
    }

    return payload;
  });

  // Error logging hook
  fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error) => {
    const logData = {
      method: request.method,
      url: request.url,
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || 500
      },
      requestId: request.id,
      timestamp: new Date().toISOString()
    };

    logger.error('Request error', logData);
  });

  logger.info('Logging middleware configured', {
    logLevel,
    logBody,
    excludePaths,
    includeHeaders
  });
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'auth'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}