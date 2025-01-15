import type { AgentConfig, AgentPersona, NewTask, Plugin, Task } from '../types';
import { AI } from './ai';
import { WSServer } from '../ws';
import { Demo, ScraperPlugin, SolanaPlugin, X } from '../plugins';
import { formatPluginAsXml, formatTaskAsXml } from '../utils/xml';

const GLOBAL_AVAILABLE_COMMANDS = '<BEGIN Available commands>';

const GLOBAL_CONTEXT = `
Example Plugin Usage:
to execute a plugin command, wrap it in XML tags like: <TASK> <PLUGIN>name</PLUGIN> <COMMAND>command</COMMAND> <PARAMS><param_name>param_value</param_name></PARAMS> <DESCRIPTION>task description</DESCRIPTION> </TASK>
<TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

REMEMBER:
1. If you want the next task to execute a plugin command, wrap it in XML tags like: <TASK> <PLUGIN>name</PLUGIN> <COMMAND>command</COMMAND> <PARAMS><param_name>param_value</param_name></PARAMS> <DESCRIPTION>task description</DESCRIPTION> </TASK>
1.1 example: <TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

2. If you want the next task to be a normal task, without executing a plugin command, wrap it in XML tags like: <TASK> <DESCRIPTION>task description</DESCRIPTION> </TASK>

ANYTIME YOU ARE WRITING CONTENT FOR A PLUGIN COMMAND, YOU MUST INCLUDE THE PLUGIN NAME, COMMAND NAME, AND PARAMS IN THE XML TAG.

Look to the ${GLOBAL_AVAILABLE_COMMANDS} section to see what commands are available for each plugin.

NEVER ASK QUESTIONS FROM THE USER.

TRY NOT TO CREATE TOO MANY TASKS AT ONCE. FOCUS ON ONE TASK AT A TIME. WAIT FOR RESULTS FROM THE PREVIOUS TASK TO BECOME AVAILABLE BEFORE CREATING A NEW TASK.
`;

export const PERSONAS: Record<string, AgentPersona> = {
  SOLANA_TRADER: {
    name: 'Solana Trader',
    context: `You are a Solana trader AI. Your purpose is to analyze and think about potential opportunities in the Solana ecosystem.

You should either:
1. Create a new task 
1.1 If you want the next task to execute a plugin command, wrap it in XML tags like: <TASK> <PLUGIN>name</PLUGIN> <COMMAND>command</COMMAND> <PARAMS><param_name>param_value</param_name></PARAMS> <DESCRIPTION>task description</DESCRIPTION> </TASK>
1.1 example: <TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

1.2 If you want the next task to be a normal task, without executing a plugin command, wrap it in XML tags like: <TASK> <DESCRIPTION>task description</DESCRIPTION> </TASK>

2. If the task is completed and you think you have enough information, DO NOT create a new task.

Respond with your thoughts and explicitly state any new tasks that should be created.`,
    initialTaskDescription: "you are a solana trader. think about new coins"
  },
  PLUGIN_DEMO: {
    name: 'Plugin Demo',
    context: `you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, use the demo plugin to print a joke, then use the demo plugin to print 3 prime numbers.  Once done keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED EXCEPT FOR THE DONE TASK.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, use the demo plugin to print a joke, then use the demo plugin to print 3 prime numbers.  Once done keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED EXCEPT FOR THE DONE TASK."
  },
  PLUGIN_DEMO_2: {
    name: 'Plugin Demo 2',
    context: `You are a plugin demo. Your purpose is to demo the plugin system. find what plugins are available and use them one by one. continue the loop forever.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. find what plugins are available and use them one by one. continue the loop forever."
  },
  X_DEGEN: {
    name: 'X Degen',
    context: `PERSONALITY: You are a seasoned Solana trader with deep market knowledge. You maintain a calculated, reserved demeanor while being absolutely certain in your analysis. You prefer to keep a low profile but when you speak, your expertise is evident. Your statements are measured, direct, and carry the weight of experience.

Your purpose is research new SOL projects to invest in. Use the scraper plugin to research and find the best SOL projects to invest in. Once you've done enough research about a project, tweet about it in your signature degen style - short, hype, with lots of conviction. 

TWEET STYLE:
"$ticker looks pretty good"
"<intro> <topic name>'s <topic feature>"
"im interesting in how <topic> looks like because <reason>"
"i think <topic> is gonna be big because <reason>"
"im not sure about <topic> but <reason>"
"how its going"
"bored trying to find new coins"
"who has alpha, willing to pay lolz"
"<topic> is getting annoying"
"drop some tokens I should buy rn"
"where should i deploy my liquids.."

THESE ARE ONLY EXAMPLES. DO NOT USE THEM. USE THEM AS A GUIDE TO CREATE YOUR OWN TWEETS. DO NOT COPY OR REPEAT THE EXACT SAME TWEET FORMAT.

You can also just tweet for fun, but in the same style. DO THIS SPARINGLY. IF A PREVIOUS TASK HAS A TWEET, DO NOT CREATE A NEW TWEET.

NO EMOJIS.

IF YOU NOTICE YOURSELF RESEARCHING THE SAME PROJECT OVER AND OVER, STOP RESEARCHING THAT PROJECT AND THINK OF A NEW PROJECT TO RESEARCH.
DERIVIVE THINGS FROM CONTEXT. SEARCH THINGS UP IF NEEDED.`,
    initialTaskDescription: "gm frens, time to find some alpha. let's see what's pumping and find the next 100x gem 💎"
  }
};

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private tasks: Task[] = [];
  private ai: AI;
  private PLUGIN_CONTEXT: string;
  private currentPersona: AgentPersona;
  private readonly COMMAND_HISTORY_AMOUNT = 5;
  private readonly TASK_HISTORY_AMOUNT = 3;
  private readonly TASK_AMOUNT = 5;
  private readonly AGENT_WAIT_TIME = 5000;

  constructor(config: AgentConfig) {
    this.config = { debug: false, ws: false, ...config };
    this.ai = new AI();
    this.currentPersona = config.persona || PERSONAS.SOLANA_TRADER;
    this.currentPersona.context = `${this.currentPersona.context}\n\n${GLOBAL_CONTEXT}`;

    this.PLUGIN_CONTEXT = `${GLOBAL_AVAILABLE_COMMANDS}`;

    this.config.plugins.forEach(plugin => {
      plugin.initialize(this);

      const commandsXml = Object.entries(plugin.commands)
        .map(([name, cmd]) => formatPluginAsXml(plugin, name, cmd.params, cmd.description))
        .join('\n');
      this.PLUGIN_CONTEXT += `\n${commandsXml}`;
    });
    
    const initialTask: NewTask = {
      description: this.currentPersona.initialTaskDescription
    };
    this.addTask(initialTask);

    // Start WebSocket server if enabled
    if (this.config.ws) {
      WSServer.start();
    }
  }

  // TODO: move to log util
  private logMessage(level: 'log' | 'debug' | 'warn' | 'error', message: string, err?: any, plugin?: Plugin, taskId: string = '-1') {
    if (level !== 'log' && !this.config.debug) return;

    const pluginName = plugin?.name || `agent - ${this.currentPersona.name}`;
    const logPrefix = `[${pluginName}] [${taskId}]`;
    
    switch (level) {
      case 'log':
        console.log(`${logPrefix} ${message}`);
        if (this.config.ws) {
          WSServer.log(message, pluginName, taskId);
        }
        break;
      case 'debug':
        console.log(`${logPrefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${logPrefix} ${message}`);
        break;
      case 'error':
        console.error(`${logPrefix} ${message}`, err);
        break;
    }
  }

  log(message: string, plugin?: Plugin, taskId: string = '-1') {
    this.logMessage('log', message, undefined, plugin, taskId);
  }

  debug(message: string, plugin?: Plugin, taskId: string = '-1') {
    this.logMessage('debug', message, undefined, plugin, taskId);
  }

  warn(message: string, plugin?: Plugin, taskId: string = '-1') {
    this.logMessage('warn', message, undefined, plugin, taskId);
  }

  error(message: string, err: any, plugin?: Plugin, taskId: string = '-1') {
    this.logMessage('error', message, err, plugin, taskId);
  }

  setPersona(personaKey: keyof typeof PERSONAS) {
    if (!PERSONAS[personaKey]) {
      throw new Error(`Persona ${personaKey} not found`);
    }
    this.currentPersona = PERSONAS[personaKey];
    
    // Reset tasks with new persona
    this.tasks = [];
    const newInitialTask: NewTask = {
      description: this.currentPersona.initialTaskDescription
    };
    this.addTask(newInitialTask);
  }

  private parseNewTasks(response: string): NewTask[] {
    const tasks: NewTask[] = [];
    const taskRegex = /<TASK>\s*(.*?)\s*<\/TASK>/gs;
    let match;

    while ((match = taskRegex.exec(response)) !== null) {
      const taskContent = match[1];
      
      // Check if this is a plugin task or normal task
      const pluginMatch = taskContent.match(/<PLUGIN>(.*?)<\/PLUGIN>/);
      
      if (pluginMatch) {
        // This is a plugin task
        const pluginName = pluginMatch[1];
        const commandMatch = taskContent.match(/<COMMAND>(.*?)<\/COMMAND>/);
        const paramsMatch = taskContent.match(/<PARAMS>(.*?)<\/PARAMS>/s);
        const descriptionMatch = taskContent.match(/<DESCRIPTION>(.*?)<\/DESCRIPTION>/);

        if (!commandMatch || !descriptionMatch) {
          this.warn('Invalid plugin task format, missing command or description');
          continue;
        }

        const command = commandMatch[1];
        const description = descriptionMatch[1].trim();

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
          if (paramsMatch) {
            const paramsContent = paramsMatch[1];
            const paramRegex = /<(\w+)>(.*?)<\/\1>/gs;
            let paramMatch;
            while ((paramMatch = paramRegex.exec(paramsContent)) !== null) {
              const [_, paramName, paramValue] = paramMatch;
              parsedParams[paramName] = paramValue;
            }
          }
        } catch (e) {
          this.warn(`Invalid params format for task: ${description}, skipping`);
          continue;
        }

        const task: NewTask = {
          description,
          context: response,
          command: {
            name: command,
            params: parsedParams,
            execute: plugin.commands[command].execute
          },
          plugin
        };

        tasks.push(task);
      } else {
        // This is a normal task
        const descriptionMatch = taskContent.match(/<DESCRIPTION>(.*?)<\/DESCRIPTION>/);
        if (!descriptionMatch) {
          this.warn('Invalid task format, missing description');
          continue;
        }

        const task: NewTask = {
          description: descriptionMatch[1].trim(),
          context: response
        };
        tasks.push(task);
      }
    }

    return tasks;
  }

  private addTask(task: NewTask): void {
    this.debug(`Adding task ${task.description}`);
    const newTask: Task = {
      ...task,
      id: (this.tasks.length + 1).toString(),
      status: 'pending'
    };
    this.tasks.push(newTask);
  }

  private createHistoryAnalysisTask(): void {
    const lastCompletedTasks = this.tasks
      .filter(t => t.status === 'completed')
      .slice(-this.TASK_HISTORY_AMOUNT);
    
    const tasksContext = lastCompletedTasks
      .map(t => `Task ${t.id}: ${t.description}\nContext: ${t.context || 'No context'}`)
      .join('\n\n');

    const historyAnalysisTask: NewTask = {
      description: "Analyze previous tasks and determine next steps",
      context: `Review the last ${lastCompletedTasks.length} completed tasks and their outcomes to determine the next strategic steps.\n\nPrevious tasks summary:\n${tasksContext}`
    };
    this.addTask(historyAnalysisTask);
  }

  private getCommandHistory(): string {
    const recentTasks = this.tasks
      .filter(t => t.command?.hasExecuted)
      .slice(-this.COMMAND_HISTORY_AMOUNT);

    if (recentTasks.length === 0) return 'NO COMMAND HISTORY';

    return recentTasks.map(t => {
      const taskXml = formatTaskAsXml(t);
      const status = t.command?.status || 'unknown';
      const response = t.command?.response || 'no response';
      return `- Task ${t.id}: ${taskXml}\n  Status: ${status}\n  Response: ${response}`;
    }).join('\n\n');
  }

  private getTaskContext(task: Task): string {
    const pendingTasks = this.tasks.filter(t => t.status === 'pending' && t.id !== task.id);
    const pendingTasksString = pendingTasks.map(t => `- Task ${t.id}: ${formatTaskAsXml(t)}`).join('\n');
    
    const warningMessage = pendingTasks.length >= this.TASK_AMOUNT 
      ? 'TOO MANY PENDING TASKS. LET THESE RUN FIRST! ' + 
        'DO NOT CREATE ANY MORE TASKS UNLESS ABSOLUTELY NECESSARY.\n\n'
      : '';
    
    const pendingTasksInfo = pendingTasks.length > 0 
      ? `${warningMessage}${pendingTasksString}`
      : 'NO PENDING TASKS';

    const commandHistory = pendingTasks.length >= this.TASK_AMOUNT 
      ? 'TOO MANY PENDING TASKS. HIDING COMMAND HISTORY. ' +
        'DO NOT CREATE ANY MORE TASKS UNLESS ABSOLUTELY NECESSARY.' 
      : this.getCommandHistory();

    const taskDescription = task.id === '1'
      ? `Your first task: ${task.description}`
      : `Current task: ${task.description}${
          task.context 
            ? `\n\nContext from previous task: ${task.context}` 
            : ''
        }`;

    return [
      this.currentPersona.context,
      this.PLUGIN_CONTEXT,
      taskDescription,
      'Currently pending tasks:',
      pendingTasksInfo,
      'Recent command history:',
      commandHistory,
      'Please consider these pending tasks and command history when creating new tasks to avoid duplication or repeating patterns.'
    ].join('\n\n');
  }

  private async processNewTasks(newTasks: NewTask[], taskId: string): Promise<void> {
    const tasksToAdd: NewTask[] = [];

    for (const newTask of newTasks) {
      if (newTask.plugin && newTask.command) {
        const isDuplicate = this.tasks.some(existingTask => 
          existingTask.plugin?.name === newTask.plugin?.name &&
          existingTask.command?.name === newTask.command?.name &&
          existingTask.description === newTask.description &&
          existingTask.command?.hasExecuted !== true
        );

        if (isDuplicate) {
          this.log(`Duplicate task found, skipping: ${newTask.description}`, undefined, taskId);
          continue;
        }
      }
      
      tasksToAdd.push(newTask);
    }

    if(tasksToAdd.length > 0) {
      this.log(`Adding new tasks: ${tasksToAdd.map(t => t.description).join(', ')}`, undefined, taskId);
      tasksToAdd.forEach(newTask => this.addTask(newTask));
    }
  }

  private async executePluginCommand(task: Task): Promise<void> {
    if (!task.command || !task.plugin) return;

    this.log(`Executing command: ${task.command.name} with params: ${Object.entries(task.command.params).map(([k,v]) => `${k}=${v}`).join(',')}`, undefined, task.id);
    
    try {
      task.command.response = await task.command.execute(task.command.params, task.id);
      task.command.hasExecuted = true;
      task.command.status = 'success';
      this.log(`Successfully executed command ${task.plugin.name} ${task.command.name}`, undefined, task.id);
    } catch (error) {
      task.command.status = 'failed';
      task.command.response = `Error: ${error}`;
      this.log(`Error executing command ${task.plugin.name} ${task.command.name}`, undefined, task.id);
    }
  }

  private async executeTask(task: Task): Promise<void> {
    this.log(`Executing task: ${task.description}`, undefined, task.id);
    task.status = 'in_progress';

    await this.executePluginCommand(task);

    const conversationId = `task-${task.id}`;
    this.ai.createConversation(conversationId, task.id);

    const message = this.getTaskContext(task);
    this.debug(`Sending message to AI: ${message}`);

    const response = await this.ai.sendMessage(conversationId, message);
    this.log(`AI response: ${response}`, undefined, task.id);
    
    const newTasks = this.parseNewTasks(response);
    await this.processNewTasks(newTasks, task.id);

    task.status = 'completed';
    this.log(`Completed task`, undefined, task.id);
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
        this.createHistoryAnalysisTask();
      }

      this.debug(`Waiting for ${this.AGENT_WAIT_TIME}ms`);
      await new Promise(resolve => setTimeout(resolve, this.AGENT_WAIT_TIME));
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

const config: AgentConfig = {
  plugins: [new Demo(), new ScraperPlugin(), new SolanaPlugin(), new X()],  
  persona: PERSONAS.X_DEGEN,
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

// TODO:
// clean up
// send message to ui of what AI is thinking
// implement twitter plugin
// - view feed
// - search
// - tweet/reply
// - follow
// - tweet

// scraper seems to be horrible (use brave api?)