import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

export interface CorsOptions {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
}

export async function setupCorsMiddleware(
  fastify: FastifyInstance, 
  options: CorsOptions = {}
) {
  const {
    allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'],
    allowCredentials = true,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'x-requested-with']
  } = options;

  // Register CORS plugin
  await fastify.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow localhost with any port in development
      if (process.env.NODE_ENV !== 'production') {
        const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
        if (localhostPattern.test(origin)) {
          return callback(null, true);
        }
      }
      
      // Reject other origins
      callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    },
    methods: allowedMethods,
    allowedHeaders,
    credentials: allowCredentials,
    // Preflight cache duration
    maxAge: 86400 // 24 hours
  });

  // Log configuration using external logger since fastify.log may not be available
  const logger = require('../../utils/logger').createLogger('cors');
  logger.info('CORS middleware configured', {
    allowedOrigins,
    allowCredentials,
    allowedMethods,
    allowedHeaders
  });
}