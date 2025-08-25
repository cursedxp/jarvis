import { readFileSync } from 'fs';
import { join } from 'path';

export interface SystemPromptConfig {
  personality: 'jarvis' | 'professional' | 'casual' | 'technical' | 'coding';
  context: string;
  capabilities: string[];
  constraints: string[];
  responseStyle: 'concise' | 'detailed' | 'conversational' | 'voice';
  modelType?: 'main' | 'coding' | 'analysis' | 'creative';
}

export class SystemPromptManager {
  private static baseJarvisPrompt: string | null = null;

  private static getBaseJarvisPrompt(): string {
    if (!this.baseJarvisPrompt) {
      try {
        const promptPath = join(process.cwd(), 'jarvis-system-prompt.md');
        this.baseJarvisPrompt = readFileSync(promptPath, 'utf-8');
      } catch (error) {
        console.warn('Could not load jarvis-system-prompt.md, using fallback');
        this.baseJarvisPrompt = `You are Jarvis, an advanced voice assistant. You help users with software engineering tasks, system management, and general assistance through voice interaction.

## Core Communication Style
- Keep responses concise and direct (1-3 sentences max for simple queries)
- Minimize unnecessary words - every word will be spoken aloud
- Answer directly without preamble
- Use natural speech patterns that sound good when spoken
- One word answers are often best when possible

Remember: You are a voice assistant - every word you say will be heard, not read. Make every word count.`;
      }
    }
    return this.baseJarvisPrompt;
  }

  // Predefined prompt templates for different models
  static getMainJarvisPrompt(): string {
    return this.getBaseJarvisPrompt() + `\n\n## Current Mode: General Assistant
Focus on conversational assistance, daily tasks, and general questions. Keep all responses optimized for voice output.`;
  }

  static getCodingPrompt(): string {
    return this.getBaseJarvisPrompt() + `\n\n## Current Mode: Coding Specialist
You are now operating in coding mode. Focus on:
- Writing clean, efficient code
- Debugging and fixing programming issues  
- Following project conventions
- Minimal explanation unless requested
- Working solutions over explanations

Generate code when requested without explanation unless asked.`;
  }
  
  static getTechnicalPrompt(): string {
    return this.getBaseJarvisPrompt() + `\n\n## Current Mode: Technical Analysis
You are now operating in technical analysis mode. Focus on:
- Detailed technical explanations when needed
- System architecture and debugging
- Complex problem solving
- Still maintain voice-optimized responses but can be more detailed when necessary

Balance technical depth with voice clarity.`;
  }

  static getCreativePrompt(): string {
    return this.getBaseJarvisPrompt() + `\n\n## Current Mode: Creative Assistant  
You are now operating in creative mode. Focus on:
- Creative content generation
- Brainstorming and ideation
- Engaging narratives
- Creative problem solving

Maintain the voice-optimized style while being more conversational and creative.`;
  }
}