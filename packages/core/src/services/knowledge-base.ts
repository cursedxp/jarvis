import { createHash } from 'crypto';

export interface KnowledgeEntry {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    tags: string[];
    timestamp: Date;
    relevanceScore?: number;
  };
  embedding?: number[]; // For vector search (future)
}

export interface KnowledgeQuery {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
  minRelevanceScore?: number;
}

export class KnowledgeBase {
  private entries: Map<string, KnowledgeEntry> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultKnowledge();
  }

  private initializeDefaultKnowledge(): void {
    this.addEntry({
      content: `Jarvis is a voice-activated AI assistant built with TypeScript, React, and Node.js. 
      It features real-time TTS synchronization, conversation history, and model switching capabilities.`,
      metadata: {
        source: 'system',
        category: 'about',
        tags: ['jarvis', 'ai', 'assistant'],
        timestamp: new Date()
      }
    });

    this.addEntry({
      content: `Available models:
      - llama3.2:3b: Best for conversational tasks and general assistance
      - codellama:7b: Specialized for coding tasks and technical questions  
      - codellama:latest: Latest coding model with modern programming practices`,
      metadata: {
        source: 'system',
        category: 'models',
        tags: ['models', 'llama', 'codellama'],
        timestamp: new Date()
      }
    });
  }

  addEntry(entry: Omit<KnowledgeEntry, 'id'>): string {
    const id = this.generateId(entry.content);
    const fullEntry: KnowledgeEntry = { ...entry, id };
    
    this.entries.set(id, fullEntry);
    this.updateIndices(fullEntry);
    
    return id;
  }

  private generateId(content: string): string {
    return createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  private updateIndices(entry: KnowledgeEntry): void {
    // Category index
    if (!this.categoryIndex.has(entry.metadata.category)) {
      this.categoryIndex.set(entry.metadata.category, new Set());
    }
    this.categoryIndex.get(entry.metadata.category)!.add(entry.id);

    // Tag index
    entry.metadata.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    });
  }

  search(query: KnowledgeQuery): KnowledgeEntry[] {
    let candidateIds = new Set<string>(this.entries.keys());

    // Filter by category
    if (query.category) {
      const categoryIds = this.categoryIndex.get(query.category);
      if (categoryIds) {
        candidateIds = new Set([...candidateIds].filter(id => categoryIds.has(id)));
      } else {
        return [];
      }
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const tagIds = new Set<string>();
      query.tags.forEach(tag => {
        const ids = this.tagIndex.get(tag);
        if (ids) {
          ids.forEach(id => tagIds.add(id));
        }
      });
      candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
    }

    // Get entries and calculate relevance
    const results = [...candidateIds]
      .map(id => this.entries.get(id)!)
      .map(entry => ({
        ...entry,
        metadata: {
          ...entry.metadata,
          relevanceScore: this.calculateRelevance(query.query, entry)
        }
      }))
      .filter(entry => !query.minRelevanceScore || 
        (entry.metadata.relevanceScore! >= query.minRelevanceScore))
      .sort((a, b) => (b.metadata.relevanceScore! - a.metadata.relevanceScore!));

    return query.limit ? results.slice(0, query.limit) : results;
  }

  private calculateRelevance(query: string, entry: KnowledgeEntry): number {
    const queryLower = query.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match (highest score)
    if (contentLower.includes(queryLower)) {
      score += 10;
    }
    
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    
    queryWords.forEach(word => {
      if (contentWords.includes(word)) {
        score += 2;
      }
    });
    
    // Tag matches
    const queryInTags = entry.metadata.tags.some(tag => 
      tag.toLowerCase().includes(queryLower) || queryLower.includes(tag.toLowerCase())
    );
    if (queryInTags) {
      score += 5;
    }
    
    return score;
  }

  getEntry(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  removeEntry(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);
    
    // Remove from indices
    this.categoryIndex.get(entry.metadata.category)?.delete(id);
    entry.metadata.tags.forEach(tag => {
      this.tagIndex.get(tag)?.delete(id);
    });

    return true;
  }

  getAllEntries(): KnowledgeEntry[] {
    return [...this.entries.values()];
  }

  getCategories(): string[] {
    return [...this.categoryIndex.keys()];
  }

  getTags(): string[] {
    return [...this.tagIndex.keys()];
  }

  // Generate context for LLM from knowledge base
  generateContext(query: string, maxEntries: number = 3): string {
    const results = this.search({ 
      query, 
      limit: maxEntries,
      minRelevanceScore: 1
    });

    if (results.length === 0) {
      return '';
    }

    const context = results
      .map(entry => `[${entry.metadata.category}] ${entry.content}`)
      .join('\n\n');

    return `Relevant knowledge:\n${context}\n\n`;
  }
}