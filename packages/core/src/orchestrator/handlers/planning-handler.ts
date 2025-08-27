import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { mongodbPlanningService } from '../../services/planning-mongodb';
import { intentAnalyzer, setIntentAnalyzerOrchestrator } from '../../services/intent-analyzer';
import { taskGenerator } from '../../services/task-generator';

export class PlanningHandler extends BaseHandler {
  private io?: any;
  private orchestrator: Orchestrator;
  
  constructor(orchestrator: Orchestrator, io?: any) {
    super();
    this.orchestrator = orchestrator;
    this.io = io;
    // Set the orchestrator reference for LLM-based intent analysis
    setIntentAnalyzerOrchestrator(orchestrator);
    console.log('📡 PLANNING HANDLER: Initialized with Socket.IO instance:', !!io);
  }

  getHandlerName(): string {
    return 'PlanningHandler';
  }

  getCommands(): string[] {
    return ['planning'];
  }

  async handle(command: Command): Promise<any> {
    const { message } = command.payload;
    
    console.log('🚀 AI PLANNING HANDLER: Processing message:', message);
    
    try {
      // Get current tasks from MongoDB directly
      const todaysPlan = await mongodbPlanningService.getTodaysPlan();
      console.log('📋 AI HANDLER: Retrieved plan directly from MongoDB');
      
      // Use AI-powered intent analysis
      const analysis = await intentAnalyzer.analyzeIntent(message, todaysPlan?.tasks || []);
      console.log('🤖 AI HANDLER: Intent analysis result:', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        entities: analysis.entities,
        reasoning: analysis.reasoning
      });
      
      // Handle based on detected intent
      switch (analysis.intent) {
        case 'GENERATE_TASKS':
          if (analysis.entities.count) {
            const taskType = analysis.entities.taskType || 'general';
            const taskCount = analysis.entities.count || 5;
            console.log(`✅ AI HANDLER: Generating ${taskCount} ${taskType} tasks`);
            
            try {
              const generatedTasks = await taskGenerator.generateTasks(
                taskCount,
                taskType,
                analysis.entities.timeframe || 'today'
              );
              
              const addedTasks = [];
              for (const taskTitle of generatedTasks) {
                const result = await mongodbPlanningService.addTask({
                  title: taskTitle,
                  description: `AI-generated ${analysis.entities.taskType} task`,
                  priority: 'medium'
                });
                
                if (result) {
                  addedTasks.push(taskTitle);
                }
              }
              
              // Emit Socket.IO event for real-time frontend updates
              if (addedTasks.length > 0 && this.io) {
                console.log(`📡 AI HANDLER: Emitting Socket.IO events for ${addedTasks.length} generated tasks`);
                for (const taskTitle of addedTasks) {
                  this.io.emit('planning_updated', {
                    action: 'task_added',
                    task: { title: taskTitle, description: `AI-generated ${taskType} task`, priority: 'medium' },
                    timestamp: new Date()
                  });
                }
              }
              
              return {
                type: 'planning-response',
                content: addedTasks.length > 0 
                  ? `Generated ${addedTasks.length} ${taskType} tasks for you: ${addedTasks.slice(0, 3).join(', ')}${addedTasks.length > 3 ? ` and ${addedTasks.length - 3} more` : ''}` 
                  : `Failed to generate tasks`,
                success: addedTasks.length > 0
              };
            } catch (error) {
              console.error('AI HANDLER: Error generating tasks:', error);
              return {
                type: 'planning-response',
                content: 'Sorry, I encountered an error while generating tasks for you',
                success: false
              };
            }
          }
          break;
          
        case 'ADD_TASK':
          console.log(`✅ AI HANDLER: Using AI to understand task intent from: "${message}"`);
          
          // Let AI naturally understand the task from the full message
          const taskTitle = await this.generateSmartTaskTitle(message, analysis.entities.taskName || 'New task');
          
          console.log(`✅ AI HANDLER: Adding task "${taskTitle}"`);
          const result = await mongodbPlanningService.addTask({
            title: taskTitle,
            description: 'Task added via AI voice command',
            priority: 'medium'
          });
          
          // Emit Socket.IO event for real-time frontend updates
          if (result && this.io) {
            console.log(`📡 AI HANDLER: Emitting Socket.IO event - task_added: ${taskTitle}`);
            this.io.emit('planning_updated', {
              action: 'task_added',
              task: { title: taskTitle, description: 'Task added via AI voice command', priority: 'medium' },
              timestamp: new Date()
            });
          }
          
          return {
            type: 'planning-response',
            content: result ? `Task "${taskTitle}" added to your plan` : `Failed to add task "${taskTitle}"`,
            success: result
          };
          break;
          
        case 'MOVE_TASK':
          if (analysis.entities.taskName && analysis.entities.targetStatus && todaysPlan?.tasks && todaysPlan.tasks.length > 0) {
            // Find matching task with fuzzy matching
            const task = todaysPlan.tasks.find(t => 
              t.title.toLowerCase().includes(analysis.entities.taskName!.toLowerCase()) ||
              analysis.entities.taskName!.toLowerCase().includes(t.title.toLowerCase())
            );
            
            if (task) {
              console.log(`✅ AI HANDLER: Moving task "${task.title}" to ${analysis.entities.targetStatus}`);
              const result = await mongodbPlanningService.updateTaskStatus(task.id, analysis.entities.targetStatus);
              
              // Emit Socket.IO event for real-time frontend updates
              if (result && this.io) {
                console.log(`📡 AI HANDLER: Emitting Socket.IO event - task_moved: ${task.title} -> ${analysis.entities.targetStatus}`);
                this.io.emit('planning_updated', {
                  action: 'task_moved',
                  task: { id: task.id, title: task.title, status: analysis.entities.targetStatus },
                  timestamp: new Date()
                });
              }
              
              const statusText = analysis.entities.targetStatus === 'in-progress' ? 'in progress' : analysis.entities.targetStatus;
              return {
                type: 'planning-response',
                content: result 
                  ? `Task "${task.title}" moved to ${statusText}` 
                  : `Failed to move task "${task.title}"`,
                success: result
              };
            } else {
              return {
                type: 'planning-response',
                content: `I couldn't find a task matching "${analysis.entities.taskName}". Available tasks: ${todaysPlan.tasks.map(t => t.title).join(', ')}`,
                success: false
              };
            }
          }
          break;
          
        case 'DELETE_TASK':
          if (analysis.entities.taskName && todaysPlan?.tasks && todaysPlan.tasks.length > 0) {
            // Find matching task with fuzzy matching
            const task = todaysPlan.tasks.find(t => 
              t.title.toLowerCase().includes(analysis.entities.taskName!.toLowerCase()) ||
              analysis.entities.taskName!.toLowerCase().includes(t.title.toLowerCase())
            );
            
            if (task) {
              console.log(`✅ AI HANDLER: Deleting task "${task.title}" (ID: ${task.id})`);
              const result = await mongodbPlanningService.deleteTask(task.id);
              
              // Emit Socket.IO event for real-time frontend updates
              if (result && this.io) {
                this.io.emit('planning_updated', {
                  action: 'task_deleted',
                  task: { id: task.id, title: task.title },
                  timestamp: new Date()
                });
              }
              
              return {
                type: 'planning-response',
                content: result ? `Task "${task.title}" removed from your plan` : `Failed to delete task "${task.title}"`,
                success: result
              };
            } else {
              return {
                type: 'planning-response',
                content: `I couldn't find a task matching "${analysis.entities.taskName}" to delete`,
                success: false
              };
            }
          }
          break;

        case 'DELETE_ALL_TASKS':
          console.log('✅ AI HANDLER: Deleting ALL tasks...');
          const deleteResult = await mongodbPlanningService.deleteAllTasks();
          
          // Emit Socket.IO event for real-time frontend updates
          if (deleteResult && this.io) {
            console.log('📡 AI HANDLER: Emitting Socket.IO event - all_tasks_deleted');
            this.io.emit('planning_updated', {
              action: 'all_tasks_deleted',
              timestamp: new Date()
            });
          }
          
          return {
            type: 'planning-response',
            content: deleteResult ? 'All tasks cleared from your plan' : 'Failed to clear all tasks',
            success: deleteResult
          };
          
        case 'UNKNOWN':
        default:
          console.log('❓ AI HANDLER: Intent not understood, falling back...');
          return {
            type: 'planning-response',
            content: `I understand you want to do something with your tasks, but I'm not sure what. You can:\n• Add tasks: "add task [name]"\n• Move tasks: "move [task] to done"\n• Delete tasks: "delete [task]" or "clear all tasks"\n\nWhat would you like to do?`,
            success: false
          };
      }
      
    } catch (error) {
      console.error('AI HANDLER: Error processing planning command:', error);
      return {
        type: 'planning-response',
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }

  private async generateSmartTaskTitle(originalMessage: string, fallbackTitle: string): Promise<string> {
    try {
      // Simple, direct AI prompt - let AI naturally understand the intent
      const aiPrompt = `What task does this person want to create?

"${originalMessage}"

Reply with just a short, clear task title (like "Send vehicle title to company" or "Call doctor"):`;

      const aiResponse = await this.orchestrator.processWithLLM(aiPrompt);
      
      // Clean up the AI response
      const smartTitle = aiResponse.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^(Task:|Title:)\s*/i, '') // Remove prefixes
        .replace(/^\d+\.\s*/, '') // Remove numbering
        .replace(/^-\s*/, '') // Remove dashes
        .split('\n')[0] // Take first line only
        .trim();

      // Simple validation - if AI gave a reasonable response, use it
      if (smartTitle && smartTitle.length > 3 && smartTitle.length < 80) {
        console.log(`🤖 AI understood intent: "${smartTitle}"`);
        return smartTitle.charAt(0).toUpperCase() + smartTitle.slice(1);
      }
      
      console.log(`⚠️ AI response unclear, using fallback: "${fallbackTitle}"`);
      return fallbackTitle;
      
    } catch (error) {
      console.error('🚨 Error with AI task understanding:', error);
      // Simple fallback extraction
      const simple = originalMessage
        .replace(/^.*(need to|want to|remind me to)\s+/i, '')
        .replace(/\s+so\s+(create|add|make).*/i, '')
        .trim();
      
      return simple.length > 3 ? simple.charAt(0).toUpperCase() + simple.slice(1) : fallbackTitle;
    }
  }
}