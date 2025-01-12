import { Demo } from '../plugins/demo';
import type { AgentConfig, AgentPersona, Command, Plugin, Logger } from '../types';
import { AI } from './ai';
import { WSServer } from '../ws';
import { ScraperPlugin } from '../plugins/scraper';
import { SolanaPlugin } from '../plugins/solana';
import { X } from '../plugins/x';

const GLOBAL_AVAILABLE_COMMANDS = '<BEGIN Available commands>';

const GLOBAL_CONTEXT = `
Example Plugin Usage:
to execute a plugin command, wrap it in XML tags like: <TASK PLUGIN="name" COMMAND="command" PARAMS="params">task description</TASK>
<TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL">Print LOL to the console</TASK>

REMEMBER:
1. If you want the next task to execute a plugin command, wrap it in XML tags like: <TASK PLUGIN="name" COMMAND="command" PARAMS="params">task description</TASK>
1.1 example: <TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL">Print LOL to the console</TASK>

2. If you want the next task to be a normal task, without executing a plugin command, wrap it in XML tags like: <TASK>task description</TASK>

YOU CAN USE MULTIPLE PLUGINS IN THE SAME TASK. YOU CAN USE MULTIPLE COMMANDS IN THE SAME TASK.

ANYTIME YOU ARE WRITING CONTENT FOR A PLUGIN COMMAND, YOU MUST INCLUDE THE PLUGIN NAME, COMMAND NAME, AND PARAMS IN THE XML TAG.

Look to the ${GLOBAL_AVAILABLE_COMMANDS} section to see what commands are available for each plugin.

NEVER ASK QUESTIONS FROM THE USER. NEVER ASK QUESTIONS FROM THE USER. NEVER ASK QUESTIONS FROM THE USER.

ONLY USE THE CONTEXT GIVEN AND THE PLUGIN COMMANDS TO CREATE NEW TASKS.
`;

export const PERSONAS: Record<string, AgentPersona> = {
  SOLANA_TRADER: {
    name: 'Solana Trader',
    context: `You are a Solana trader AI. Your purpose is to analyze and think about potential opportunities in the Solana ecosystem.

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
    context: `You are a plugin demo. Your purpose is to demo the plugin system. Once done dont keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED. IF A DONE TASK IS INCLUDED, MAKE SURE TO REPEAT IT IN THE NEXT TASK.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, print a joke, then print 3 prime numbers.  Once done dont keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED. IF A DONE TASK IS INCLUDED, MAKE SURE TO REPEAT IT IN THE NEXT TASK."
  },
  PLUGIN_DEMO_2: {
    name: 'Plugin Demo 2',
    context: `You are a plugin demo. Your purpose is to demo the plugin system. find what plugins are available and use them one by one. continue the loop forever.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. find what plugins are available and use them one by one. continue the loop forever."
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
  command?: Pick<Command, 'params' | 'execute' | 'name'>;
  plugin?: Plugin;
}

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private tasks: Task[];
  private ai: AI;
  private PLUGIN_CONTEXT: string;
  private currentPersona: AgentPersona;
  private logger: Logger;

  constructor(config: AgentConfig) {
    this.config = { debug: false, ws: false, ...config };
    this.ai = new AI();
    this.currentPersona = config.persona || PERSONAS.SOLANA_TRADER;
    this.currentPersona.context = `${this.currentPersona.context}\n\n${GLOBAL_CONTEXT}`;

    // Create logger object
    this.logger = {
      debug: (message: string) => this.debug(message),
      warn: (message: string) => this.warn(message),
      error: (message: string, err?: any) => this.error(message, err),
      log: (message: string, plugin?: Plugin) => this.log(message, plugin)
    };

    this.PLUGIN_CONTEXT = `${GLOBAL_AVAILABLE_COMMANDS}`;

    this.config.plugins.forEach(plugin => {
      plugin.initialize(this.logger); // TODO: maybe pass in entire agent
      const commandsXml = Object.entries(plugin.commands)
        .map(([name, cmd]) => {
          const paramsStr = Object.entries(cmd.params)
            .map(([paramName, defaultValue]) => `${paramName}=${defaultValue}`)
            .join(',');
          return `<TASK PLUGIN="${plugin.name}" COMMAND="${name}" PARAMS="${paramsStr}">${cmd.description}</TASK>`;
        })
        .join('\n');
      this.PLUGIN_CONTEXT += `\n${commandsXml}`;
    });

    this.debug(this.PLUGIN_CONTEXT);
    
    this.tasks = [{
      id: '1',
      description: this.currentPersona.initialTaskDescription,
      status: 'pending'
    }];

    // Start WebSocket server if enabled
    if (this.config.ws) {
      WSServer.start();
    }
  }

  private log(message: string, plugin?: Plugin) {
    console.log(message);
    if (this.config.ws) {
      WSServer.log(message, plugin?.name || 'agent');
    }
  }

  private debug(message: string) {
    if (this.config.debug) {
      console.log(message);
      // if (this.config.ws) {
      //   WSServer.log(message);
      // }
    }
  }

  private warn(message: string) {
    if (this.config.debug) {
      console.warn(message);
      // if (this.config.ws) {
      //   WSServer.warn(message);
      // }
    }
  }

  private error(message: string, err?: any) {
    if (this.config.debug) {
      console.error(message, err);
      // if (this.config.ws) {
      //   WSServer.error(message, err);
      // }
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
      this.debug(`-------------------------------FOUND PLUGIN TASK: ${match}-------------------------------`);
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
        if (params.trim()) {  // Only parse if params is non-empty
          params.split(',').forEach(param => {
            const [key, value] = param.split('=');
            parsedParams[key.trim()] = value.trim();
          });
        }
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
          name: command,
          params: parsedParams,
          execute: plugin.commands[command].execute
        },
        plugin
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
    this.log(`${task.description}`);
    task.status = 'in_progress';

    // Execute command if present
    let commandExecutionStatus = '';
    if (task.command && task.plugin) {
      const commandXml = `<TASK PLUGIN="${task.plugin.name}" COMMAND="${task.command.name}" PARAMS="${Object.entries(task.command.params).map(([k,v]) => `${k}=${v}`).join(',')}">${task.description}</TASK>`;
      try {
        // TODO: get response from execute, add to context, make last 10 results available and made obvious to read
        await task.command.execute(task.command.params);
        commandExecutionStatus = `\n\nPrevious task result: ${commandXml} was executed successfully. If you have another command to execute, proceed with that as your next task. If you have no more commands that need to be executed, feel free to continue the conversation naturally without any command tasks and DO NOT create a new task.`;
        this.debug(`[${task.id}] Successfully executed command`);
      } catch (error) {
        commandExecutionStatus = `\n\nPrevious task result: ${commandXml} failed with error: ${error}`;
        this.error(`[${task.id}] Error executing command:`, error);
      }
    }

    const conversationId = `task-${task.id}`;
    
    this.ai.createConversation(conversationId, task.id);

    const message = `${this.currentPersona.context}\n\n${this.PLUGIN_CONTEXT}\n\n${
      task.id === '1' 
        ? `Your first task: ${task.description}`
        : `Current task: ${task.description}${task.context ? `\n\nContext from previous task: ${task.context}` : ''}${commandExecutionStatus}`
    }`;

    this.debug(`[${task.id}] Sending message to AI: ${message}`);

    const response = await this.ai.sendMessage(conversationId, message);

    this.debug(`[${task.id}] AI response: ${response}`);
    
    // TODO: might want to add summary to response
    const newTasks = this.parseNewTasks(response);

    this.debug(`[${task.id}] New tasks: ${newTasks.length}`);

    newTasks.forEach(task => this.addTask(task));

    task.status = 'completed';
    this.debug(`Completed task ${task.id}`); 
  }

  async start() {
    this.isRunning = true;
    this.debug('Agent starting...');
    
    while (this.isRunning) {
      const pendingTask = this.tasks.find(t => t.status === 'pending');
      
      if (pendingTask) {
        await this.executeTask(pendingTask);
      } else {
        this.log(`No pending tasks, analyzing history`);
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
      this.debug(`Waiting for 5 seconds`);
      // await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  stop() {
    this.isRunning = false;
    if (this.config.ws) {
      WSServer.stop();
    }
    this.debug('Agent stopped');
  }
}

// Create and run the agent
const config: AgentConfig = {
  plugins: [new Demo(), new ScraperPlugin(), new SolanaPlugin(), new X()],
  persona: PERSONAS.SOLANA_TRADER,
  debug: true,
  ws: true
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