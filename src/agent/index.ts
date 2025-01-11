import type { AgentConfig } from '../types';
import { AI } from './ai';

const INITIAL_CONTEXT = `You are a Solana trader AI. Your purpose is to analyze and think about potential opportunities in the Solana ecosystem.

After completing each task, you should either:
1. Create a new task by wrapping it in XML tags like: <TASK>your task description here</TASK>
2. If the task is completed and you think you have enough information, DO NOT create a new task.

Respond with your thoughts and explicitly state any new tasks that should be created.`;

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  context?: string;
}

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private tasks: Task[] = [];
  private ai: AI;

  constructor(config: AgentConfig) {
    this.config = config;
    this.ai = new AI();
  }

  private parseNewTasks(response: string): string[] {
    const tasks: string[] = [];
    const regex = /<TASK>(.*?)<\/TASK>/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      tasks.push(match[1].trim());
    }

    return tasks;
  }

  private async executeTask(task: Task): Promise<void> {
    console.log(`[${task.id}] Executing task: ${task.description}`);
    task.status = 'in_progress';
    const conversationId = `task-${task.id}`;
    
    this.ai.createConversation(conversationId, task.id);

    const message = `${INITIAL_CONTEXT}\n\n${
      task.id === '1' 
        ? `Your first task: ${task.description}`
        : `Current task: ${task.description}${task.context ? `\n\nContext from previous task: ${task.context}` : ''}`
    }`;

    console.log(`[${task.id}] Sending message to AI: ${message}`);

    const response = await this.ai.sendMessage(conversationId, message);

    console.log(`[${task.id}] AI response: ${response}`);
    
    const newTasks = this.parseNewTasks(response);

    console.log(`[${task.id}] New tasks: ${newTasks.length}`);

    for (const taskDescription of newTasks) {
      this.addTask(taskDescription, response);
    }

    task.status = 'completed';
  }

  private addTask(description: string, context?: string): void {
    console.log(`Adding task ${description}`);
    const task: Task = {
      id: (this.tasks.length + 1).toString(),
      description,
      status: 'pending',
      context
    };
    this.tasks.push(task);
  }

  async start() {
    this.isRunning = true;
    console.log('Agent starting...');
    
    // Add initial task
    this.addTask("you are a solana trader. think about new coins");

    while (this.isRunning) {
      const pendingTask = this.tasks.find(t => t.status === 'pending');
      
      if (pendingTask) {
        console.log(`Executing task ${pendingTask.id}: ${pendingTask.description}`);
        await this.executeTask(pendingTask);
        console.log(`Completed task ${pendingTask.id}`);
      } else {
        // No pending tasks, analyze history to determine next steps
        const historyAnalysisTask: Task = {
          id: (this.tasks.length + 1).toString(),
          description: "Analyze previous tasks and determine next steps",
          status: 'pending',
          context: "Review all previous tasks and their outcomes to determine the next strategic steps."
        };
        this.tasks.push(historyAnalysisTask);
      }

      // Small delay to prevent tight loops
      console.log(`Waiting for 10 seconds`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Agent stopped');
  }
}

// Create and run the agent
const config: AgentConfig = {
  plugins: []
};

const agent = new Agent(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down...');
  agent.stop();
  process.exit(0);
});

// Start the agent
agent.start().catch(console.error); 