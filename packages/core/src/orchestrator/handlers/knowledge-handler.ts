import { BaseHandler } from './base-handler';
import { Command } from '../orchestrator';
import { KnowledgeBase } from '../../services/knowledge-base';

export class KnowledgeHandler extends BaseHandler {
  private knowledgeBase: KnowledgeBase;

  constructor(knowledgeBase: KnowledgeBase) {
    super();
    this.knowledgeBase = knowledgeBase;
  }

  getHandlerName(): string {
    return 'KnowledgeHandler';
  }

  getCommands(): string[] {
    return ['addKnowledge', 'searchKnowledge'];
  }

  async handle(command: Command): Promise<any> {
    switch (command.type) {
      case 'addKnowledge':
        return this.handleAddKnowledge(command);
      case 'searchKnowledge':
        return this.handleSearchKnowledge(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private async handleAddKnowledge(command: Command): Promise<any> {
    this.validateCommand(command, 'addKnowledge');
    const { content, category, tags, source = 'user' } = command.payload;

    if (!content) {
      return this.createErrorResponse(
        'knowledge-add-failed',
        'Content is required to add knowledge'
      );
    }

    try {
      const id = this.knowledgeBase.addEntry({
        content,
        metadata: {
          source,
          category: category || 'general',
          tags: tags || [],
          timestamp: new Date()
        }
      });
      
      return this.createSuccessResponse(
        'knowledge-added',
        {
          id,
          content,
          category: category || 'general',
          tags: tags || [],
          source
        },
        `Knowledge added with ID: ${id}`
      );
    } catch (error) {
      return this.createErrorResponse(
        'knowledge-add-failed',
        `Failed to add knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { content, category, tags, source }
      );
    }
  }

  private async handleSearchKnowledge(command: Command): Promise<any> {
    this.validateCommand(command, 'searchKnowledge');
    const { query, category, tags, limit = 5 } = command.payload;

    if (!query) {
      return this.createErrorResponse(
        'knowledge-search-failed',
        'Query is required to search knowledge'
      );
    }

    if (limit < 1 || limit > 50) {
      return this.createErrorResponse(
        'knowledge-search-failed',
        'Limit must be between 1 and 50'
      );
    }

    try {
      const results = this.knowledgeBase.search({
        query,
        category,
        tags,
        limit
      });
      
      return this.createSuccessResponse(
        'knowledge-results',
        {
          results,
          count: results.length,
          query,
          category,
          tags,
          limit
        },
        `Found ${results.length} knowledge entries`
      );
    } catch (error) {
      return this.createErrorResponse(
        'knowledge-search-failed',
        `Failed to search knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query, category, tags, limit }
      );
    }
  }
}