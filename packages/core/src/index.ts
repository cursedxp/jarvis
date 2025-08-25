import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { Orchestrator } from './orchestrator/orchestrator';
import { createServer } from './server';
import { initializeAdapters } from './adapters';

dotenv.config();

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