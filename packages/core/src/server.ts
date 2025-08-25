import Fastify from 'fastify';
import { Server } from 'socket.io';
import { Orchestrator } from './orchestrator/orchestrator';
import { createLogger } from './utils/logger';
import { TTSManager } from './tts-manager';

// Import route modules
import { healthRoutes } from './server/routes/health-routes';
import { modelRoutes } from './server/routes/model-routes';
import { ttsRoutes } from './server/routes/tts-routes';
import { commandRoutes } from './server/routes/command-routes';

// Import middleware
import { setupCorsMiddleware } from './server/middleware/cors-middleware';
import { setupLoggingMiddleware } from './server/middleware/logging-middleware';

const logger = createLogger('server');

interface ServerOptions {
  orchestrator: Orchestrator;
  port: number;
  host?: string;
  cors?: {
    allowedOrigins?: string[];
    allowCredentials?: boolean;
  };
  logging?: {
    logLevel?: 'info' | 'debug' | 'warn' | 'error';
    logBody?: boolean;
  };
}

export async function createServer(options: ServerOptions) {
  const { orchestrator, port, host = '0.0.0.0' } = options;
  
  const fastify = Fastify({
    logger: false, // We'll use our custom logging middleware
    trustProxy: true, // For proper IP detection behind reverse proxy
    bodyLimit: 1048576 // 1MB body limit
  });
  
  // Setup middleware
  await setupCorsMiddleware(fastify, {
    allowedOrigins: options.cors?.allowedOrigins,
    allowCredentials: options.cors?.allowCredentials
  });
  
  await setupLoggingMiddleware(fastify, {
    logLevel: options.logging?.logLevel || 'info',
    logBody: options.logging?.logBody || false
  });
  
  // Add manual error helpers since @fastify/sensible v6 requires Fastify v5
  fastify.decorate('httpErrors', {
    badRequest: (message?: string) => {
      const error: any = new Error(message || 'Bad Request');
      error.statusCode = 400;
      return error;
    },
    notFound: (message?: string) => {
      const error: any = new Error(message || 'Not Found');
      error.statusCode = 404;
      return error;
    },
    internalServerError: (message?: string) => {
      const error: any = new Error(message || 'Internal Server Error');
      error.statusCode = 500;
      return error;
    },
    serviceUnavailable: (message?: string) => {
      const error: any = new Error(message || 'Service Unavailable');
      error.statusCode = 503;
      return error;
    }
  });
  
  const io = new Server(fastify.server, {
    cors: {
      origin: options.cors?.allowedOrigins || ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: options.cors?.allowCredentials ?? true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Initialize TTS Manager with Socket.IO for real-time events
  const ttsManager = new TTSManager(io);
  
  // Register route modules
  await fastify.register(healthRoutes, { 
    orchestrator: orchestrator 
  });
  
  await fastify.register(modelRoutes, { 
    orchestrator: orchestrator 
  });
  
  await fastify.register(ttsRoutes, { 
    ttsManager: ttsManager 
  });
  
  await fastify.register(commandRoutes, { 
    orchestrator: orchestrator,
    ttsManager: ttsManager
  });
  
  // Global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    logger.error('Global error handler triggered:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode || 500
    });
    
    const statusCode = error.statusCode || 500;
    
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Internal server error',
      statusCode,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
  
  // Catch-all for undefined routes
  fastify.setNotFoundHandler(async (request, reply) => {
    logger.warn(`Route not found: ${request.method} ${request.url}`);
    return reply.code(404).send({
      success: false,
      error: 'Route not found',
      message: `The requested endpoint ${request.method} ${request.url} does not exist`,
      timestamp: new Date().toISOString()
    });
  });

  
  io.on('connection', (socket) => {
    logger.info('Client connected:', socket.id);
    
    socket.on('command', async (data, callback) => {
      try {
        const result = await orchestrator.handleCommand(data);
        callback({ success: true, data: result });
      } catch (error) {
        logger.error('Command error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    });
    
    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
    });
  });
  
  return {
    start: async () => {
      try {
        await fastify.listen({ port, host });
        
        logger.info(`🚀 Jarvis server started successfully!`);
        logger.info(`   • HTTP server listening on ${host}:${port}`);
        logger.info(`   • WebSocket server ready for real-time communication`);
        logger.info(`   • TTS service initialized with mode: ${ttsManager.getTTSMode()}`);
        logger.info(`   • Modular route handlers loaded`);
        
      } catch (error) {
        logger.error('Failed to start server:', error);
        throw error;
      }
    },
    stop: async () => {
      try {
        io.close();
        await fastify.close();
        logger.info('Server stopped successfully');
      } catch (error) {
        logger.error('Error stopping server:', error);
        throw error;
      }
    },
    io: io,  // Expose the Socket.IO instance
    getInfo: () => ({
      port,
      host,
      ttsMode: ttsManager.getTTSMode(),
      connectedClients: io.engine.clientsCount,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    })
  };
}