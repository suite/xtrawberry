import { Demo } from '../plugins/demo';
import type { AgentConfig, AgentPersona, Command } from '../types';
import { AI } from './ai';

const GLOBAL_AVAILABLE_COMMANDS = '<BEGIN Available commands>';

const GLOBAL_CONTEXT = `
Example Plugin Usage:
to execute a plugin command, wrap it in XML tags like: <TASK PLUGIN="name" COMMAND="command" PARAMS="params">task description</TASK>
<TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL">Print LOL to the console</TASK>

Look to the ${GLOBAL_AVAILABLE_COMMANDS} section to see what commands are available for each plugin.
`;

export const PERSONAS: Record<string, AgentPersona> = {
  SOLANA_TRADER: {
    name: 'Solana Trader',
    initialContext: `You are a Solana trader AI. Your purpose is to analyze and think about potential opportunities in the Solana ecosystem.

You should either:
1. Create a new task 
1.1 If you want the next task to execute a plugin command, wrap it in XML tags like: <TASK PLUGIN="name" COMMAND="command" PARAMS="params">task description</TASK>
1.1 example: <TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL">Print LOL to the console</TASK>

1.2 If you want the next task to be a normal task, without executing a plugin command, wrap it in XML tags like: <TASK>task description</TASK>

2. If the task is completed and you think you have enough information, DO NOT create a new task.

Respond with your thoughts and explicitly state any new tasks that should be created.`,
    initialTaskDescription: "you are a solana trader. think about new coins"
  },
  PLUGIN_DEMO: {
    name: 'Plugin Demo',
    initialContext: `You are a plugin demo. Your purpose is to demo the plugin system.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, print a joke. "
  }
};

/*
Available commands:
for each plugin:
  command , params

{
  name: "demo",
  params: [
    input: string
  ]
}

execute with <EXEC PLUGIN="name" COMMAND="PRINT" INPUT="LOL">
*/

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  context?: string;
  command?: Pick<Command, 'params' | 'execute'>;
}

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private tasks: Task[];
  private ai: AI;
  private PLUGIN_CONTEXT: string;
  private currentPersona: AgentPersona;

  constructor(config: AgentConfig) {
    this.config = { debug: false, ...config };
    this.ai = new AI();
    this.currentPersona = config.persona || PERSONAS.SOLANA_TRADER;
    this.currentPersona.initialContext = `${this.currentPersona.initialContext}\n\n${GLOBAL_CONTEXT}`;

    this.PLUGIN_CONTEXT = `${GLOBAL_AVAILABLE_COMMANDS}`;

    this.config.plugins.forEach(plugin => {
      plugin.initialize();
      this.PLUGIN_CONTEXT += `\n${JSON.stringify(plugin)}`;
    });

    this.debug(this.PLUGIN_CONTEXT);
    
    this.tasks = [{
      id: '1',
      description: this.currentPersona.initialTaskDescription,
      status: 'pending'
    }];
  }

  private debug(message: string) {
    if (this.config.debug) {
      console.log(message);
    }
  }

  private warn(message: string) {
    if (this.config.debug) {
      console.warn(message);
    }
  }

  private error(message: string, err?: any) {
    if (this.config.debug) {
      console.error(message, err);
    }
  }

  setPersona(personaKey: keyof typeof PERSONAS) {
    if (!PERSONAS[personaKey]) {
      throw new Error(`Persona ${personaKey} not found`);
    }
    this.currentPersona = PERSONAS[personaKey];
    
    // Reset tasks with new persona
    this.tasks = [{
      id: '1',
      description: this.currentPersona.initialTaskDescription,
      status: 'pending'
    }];
  }

  private parseNewTasks(response: string): Task[] {
    const tasks: Task[] = [];
    const pluginRegex = /<TASK PLUGIN="(.*?)" COMMAND="(.*?)" PARAMS="(.*?)">(.*?)<\/TASK>/g;
    const normalRegex = /<TASK>(.*?)<\/TASK>/g;
    let match;

    // Parse plugin tasks
    while ((match = pluginRegex.exec(response)) !== null) {
      const [_, pluginName, command, params, description] = match;
      
      // Validate plugin exists
      const plugin = this.config.plugins.find(p => p.name === pluginName);
      if (!plugin) {
        this.warn(`Plugin ${pluginName} not found, skipping task`);
        continue;
      }

      // Validate command exists
      if (!plugin.commands[command]) {
        this.warn(`Command ${command} not found in plugin ${pluginName}, skipping task`);
        continue;
      }

      // Parse params
      let parsedParams: Record<string, any> = {};
      try {
        params.split(',').forEach(param => {
          const [key, value] = param.split('=');
          parsedParams[key.trim()] = value.trim();
        });
      } catch (e) {
        this.warn(`Invalid params format for task: ${description}, skipping`);
        continue;
      }

      const task: Task = {
        id: (this.tasks.length + tasks.length + 1).toString(),
        description: description.trim(),
        status: 'pending',
        context: response,
        command: {
          params: parsedParams,
          execute: plugin.commands[command].execute
        }
      };

      tasks.push(task);
    }

    // Parse normal tasks
    while ((match = normalRegex.exec(response)) !== null) {
      const task: Task = {
        id: (this.tasks.length + tasks.length + 1).toString(),
        description: match[1].trim(),
        status: 'pending',
        context: response
      };
      tasks.push(task);
    }

    return tasks;
  }

  private addTask(task: Task): void {
    this.debug(`Adding task ${task.description}`);
    this.tasks.push(task);
  }

  private async executeTask(task: Task): Promise<void> {
    this.debug(`[${task.id}] Executing task: ${task.description}`);
    task.status = 'in_progress';

    // Execute command if present
    let commandExecutionStatus = '';
    if (task.command) {
      try {
        await task.command.execute(task.command.params);
        commandExecutionStatus = `\n\nThe previous plugin command was executed successfully. You can continue with the next task.`;
        this.debug(`[${task.id}] Successfully executed command`);
      } catch (error) {
        commandExecutionStatus = `\n\nThe previous plugin command failed with error: ${error}`;
        this.error(`[${task.id}] Error executing command:`, error);
      }
    }

    const conversationId = `task-${task.id}`;
    
    this.ai.createConversation(conversationId, task.id);

    const message = `${this.currentPersona.initialContext}\n\n${this.PLUGIN_CONTEXT}\n\n${
      task.id === '1' 
        ? `Your first task: ${task.description}`
        : `Current task: ${task.description}${task.context ? `\n\nContext from previous task: ${task.context}` : ''}${commandExecutionStatus}`
    }`;

    this.debug(`[${task.id}] Sending message to AI: ${message}`);

    const response = await this.ai.sendMessage(conversationId, message);

    this.debug(`[${task.id}] AI response: ${response}`);
    
    const newTasks = this.parseNewTasks(response);

    this.debug(`[${task.id}] New tasks: ${newTasks.length}`);

    newTasks.forEach(task => this.addTask(task));

    task.status = 'completed';
  }

  async start() {
    this.isRunning = true;
    this.debug('Agent starting...');
    
    while (this.isRunning) {
      const pendingTask = this.tasks.find(t => t.status === 'pending');
      
      if (pendingTask) {
        this.debug(`Executing task ${pendingTask.id}: ${pendingTask.description}`);
        await this.executeTask(pendingTask);
        this.debug(`Completed task ${pendingTask.id}`); 
      } else {
        // No pending tasks, analyze history to determine next steps
        const lastCompletedTasks = this.tasks
          .filter(t => t.status === 'completed')
          .slice(-3);
        
        const tasksContext = lastCompletedTasks
          .map(t => `Task ${t.id}: ${t.description}\nContext: ${t.context || 'No context'}`)
          .join('\n\n');

        const historyAnalysisTask: Task = {
          id: (this.tasks.length + 1).toString(),
          description: "Analyze previous tasks and determine next steps",
          status: 'pending',
          context: `Review the last ${lastCompletedTasks.length} completed tasks and their outcomes to determine the next strategic steps.\n\nPrevious tasks summary:\n${tasksContext}`
        };
        this.addTask(historyAnalysisTask);
      }

      // Small delay to prevent tight loops
      this.debug(`Waiting for 10 seconds`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  stop() {
    this.isRunning = false;
    this.debug('Agent stopped');
  }
}

// Create and run the agent
const config: AgentConfig = {
  plugins: [new Demo()],
  persona: PERSONAS.PLUGIN_DEMO,
  debug: false
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