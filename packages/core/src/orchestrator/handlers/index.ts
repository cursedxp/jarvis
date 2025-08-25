// Base handler and registry
export { BaseHandler } from './base-handler';
export { CommandRegistry } from './command-registry';

// Specific handlers
export { ChatHandler } from './chat-handler';
export { ModelHandler } from './model-handler';
export { PreferencesHandler } from './preferences-handler';
export { KnowledgeHandler } from './knowledge-handler';
export { TrainingHandler } from './training-handler';

// New command handler
export { CommandHandler as RefactoredCommandHandler } from '../command-handler-new';