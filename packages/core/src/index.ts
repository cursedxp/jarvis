import dotenv from 'dotenv';
import path from 'path';
import { createLogger } from './utils/logger';
import { Orchestrator } from './orchestrator/orchestrator';
import { createServer } from './server';
import { initializeAdapters } from './adapters';

// Load .env from project root (3 levels up from packages/core/src)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const logger = createLogger('core');

async function main() {
  try {
    logger.info('Starting Jarvis Core Agent...');
    
    const adapters = await initializeAdapters();
    
    const orchestrator = new Orchestrator({
      adapters,
      logger
    });
    
    const server = await createServer({
      orchestrator,
      port: parseInt(process.env.CORE_PORT || '7777')
    });
    
    // Pass the Socket.IO instance to the orchestrator for real-time planning updates
    orchestrator.setSocketIO(server.io);
    
    await server.start();
    
    logger.info('Jarvis Core Agent is running');
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start Jarvis Core:', error);
    process.exit(1);
  }
}

main();