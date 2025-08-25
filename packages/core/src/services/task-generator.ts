export class TaskGenerator {
  
  async generateTasks(count: number, taskType: string, timeframe: string): Promise<string[]> {
    console.log(`🎯 TASK GENERATOR: Generating ${count} ${taskType} tasks for ${timeframe}`)
    
    const tasks = this.getTasksForType(taskType, timeframe, count)
    
    // Shuffle and take the requested count
    const shuffledTasks = this.shuffleArray(tasks)
    return shuffledTasks.slice(0, count)
  }
  
  private getTasksForType(taskType: string, timeframe: string, count: number): string[] {
    const taskSets = {
      work: [
        'Review and organize email inbox',
        'Update project documentation',
        'Prepare agenda for next team meeting',
        'Backup important project files',
        'Clean up desktop and Downloads folder',
        'Update LinkedIn profile and connections',
        'Learn a new keyboard shortcut',
        'Organize digital workspace and bookmarks',
        'Write down 3 key accomplishments from this week',
        'Research industry trends for 30 minutes',
        'Update task tracking system',
        'Schedule upcoming meetings and deadlines',
        'Create a quick reference guide for frequently used tools',
        'Review and update CV/resume',
        'Set up an automated workflow or template'
      ],
      personal: [
        'Call a family member or friend',
        'Organize one drawer or closet area',
        'Plan meals for the next 3 days',
        'Go for a 20-minute walk outside',
        'Read for 30 minutes',
        'Write in a journal or diary',
        'Declutter phone photos and apps',
        'Do a 10-minute meditation or breathing exercise',
        'Water plants and check their health',
        'Organize personal documents and files',
        'Write a thank you note or message',
        'Plan a fun weekend activity',
        'Update personal budget or expenses',
        'Learn something new for 15 minutes',
        'Tidy up living space for 15 minutes'
      ],
      creative: [
        'Sketch or doodle for 20 minutes',
        'Write a short story or poem',
        'Learn a new art technique online',
        'Create a photo collage or mood board',
        'Try a new recipe or cooking technique',
        'Write lyrics or compose a simple melody',
        'Create something using recyclable materials',
        'Start a creative writing prompt',
        'Learn basic photography composition rules',
        'Design a simple logo or graphic',
        'Make a playlist for different moods',
        'Try origami or paper crafts',
        'Create digital art using free software',
        'Write and illustrate a short comic',
        'Practice calligraphy or hand lettering'
      ],
      health: [
        'Do 20 push-ups or bodyweight exercises',
        'Drink 2 extra glasses of water',
        'Take stairs instead of elevator today',
        'Stretch for 10 minutes',
        'Prepare a healthy snack for later',
        'Do breathing exercises for 5 minutes',
        'Take a brief walk outside',
        'Stand and move every hour while working',
        'Practice good posture for the next hour',
        'Try a new healthy breakfast option',
        'Do desk exercises during work breaks',
        'Practice mindfulness for 10 minutes',
        'Get 7-8 hours of sleep tonight',
        'Eat a piece of fruit as a snack',
        'Do a quick body scan and relaxation'
      ],
      general: [
        'Learn one new fact about something interesting',
        'Organize digital photos from the past month',
        'Update passwords for 2-3 important accounts',
        'Clean and organize one small area of living space',
        'Send a thoughtful message to someone',
        'Plan tomorrow evening activity',
        'Research a topic you\'re curious about',
        'Create a simple to-do list for tomorrow',
        'Practice a skill for 15 minutes',
        'Listen to an educational podcast episode',
        'Delete unnecessary files from devices',
        'Review and organize browser bookmarks',
        'Write down 3 things you\'re grateful for',
        'Learn 5 words in a new language',
        'Update calendar with upcoming events',
        'Check and update emergency contact information',
        'Research a place you\'d like to visit',
        'Practice typing or writing for accuracy',
        'Create a simple budget for next week',
        'Research ways to improve a daily habit'
      ]
    }
    
    const baseTasks = taskSets[taskType] || taskSets.general
    
    // Add timeframe context to tasks when appropriate
    return baseTasks.map(task => {
      if (timeframe === 'today') {
        return task
      } else if (timeframe === 'tomorrow') {
        return task.replace('today', 'tomorrow').replace('tonight', 'tomorrow night')
      } else {
        return task
      }
    })
  }
  
  private shuffleArray(array: string[]): string[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

export const taskGenerator = new TaskGenerator()