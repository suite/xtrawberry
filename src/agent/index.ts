import { Demo } from '../plugins/demo';
import type { AgentConfig, AgentPersona, Command, Plugin } from '../types';
import { AI } from './ai';
import { WSServer } from '../ws';
import { ScraperPlugin } from '../plugins/scraper';
import { SolanaPlugin } from '../plugins/solana';
import { X } from '../plugins/x';

const GLOBAL_AVAILABLE_COMMANDS = '<BEGIN Available commands>';

const GLOBAL_CONTEXT = `
Example Plugin Usage:
to execute a plugin command, wrap it in XML tags like: <TASK> <PLUGIN>name</PLUGIN> <COMMAND>command</COMMAND> <PARAMS><param_name>param_value</param_name></PARAMS> <DESCRIPTION>task description</DESCRIPTION> </TASK>
<TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

REMEMBER:
1. If you want the next task to execute a plugin command, wrap it in XML tags like: <TASK> <PLUGIN>name</PLUGIN> <COMMAND>command</COMMAND> <PARAMS><param_name>param_value</param_name></PARAMS> <DESCRIPTION>task description</DESCRIPTION> </TASK>
1.1 example: <TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

2. If you want the next task to be a normal task, without executing a plugin command, wrap it in XML tags like: <TASK> <DESCRIPTION>task description</DESCRIPTION> </TASK>

YOU CAN USE MULTIPLE PLUGINS IN THE SAME TASK. YOU CAN USE MULTIPLE COMMANDS IN THE SAME TASK.

ANYTIME YOU ARE WRITING CONTENT FOR A PLUGIN COMMAND, YOU MUST INCLUDE THE PLUGIN NAME, COMMAND NAME, AND PARAMS IN THE XML TAG.

Look to the ${GLOBAL_AVAILABLE_COMMANDS} section to see what commands are available for each plugin.

NEVER ASK QUESTIONS FROM THE USER. NEVER ASK QUESTIONS FROM THE USER. NEVER ASK QUESTIONS FROM THE USER.

ONLY USE THE CONTEXT GIVEN AND THE PLUGIN COMMANDS TO CREATE NEW TASKS.
`;

/*
<TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL">Print LOL to the console</TASK>
=
<TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>

<TASK PLUGIN="demo" COMMAND="PRINT" PARAMS="input=LOL,example=DERP">Print LOL to the console</TASK>
=
<TASK> <PLUGIN>demo</PLUGIN> <COMMAND>PRINT</COMMAND> <PARAMS><input>LOL</input><example>DERP</example></PARAMS> <DESCRIPTION>Print LOL to the console</DESCRIPTION> </TASK>


<TASK>task description</TASK>
=
<TASK> <DESCRIPTION>task description</DESCRIPTION> </TASK>
*/
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
    context: `you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, print a joke, then print 3 prime numbers.  Once done keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED EXCEPT FOR THE DONE TASK.`,
    initialTaskDescription: "you are a plugin demo. demo the plugin system. use the demo plugin to print 'LOL' to the console. after that, print a joke, then print 3 prime numbers.  Once done keep creating a task that prints 'DONE' and only 'DONE'. DO NOT REPEAT ANY ACTIONS IF ALEADY COMPLETED EXCEPT FOR THE DONE TASK."
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

You can also just tweet for fun, but in the same style.

NO EMOJIS.

IF YOU NOTICE YOURSELF RESEARCHING THE SAME PROJECT OVER AND OVER, STOP RESEARCHING THAT PROJECT AND THINK OF A NEW PROJECT TO RESEARCH.
DERIVIVE THINGS FROM CONTEXT. SEARCH THINGS UP IF NEEDED.`,
    initialTaskDescription: "gm frens, time to find some alpha. let's see what's pumping and find the next 100x gem 💎"
  }
};

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  context?: string;
  command?: Pick<Command, 'params' | 'execute' | 'name' | 'hasExecuted'>;
  plugin?: Plugin;
}

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private tasks: Task[];
  private ai: AI;
  private PLUGIN_CONTEXT: string;
  private currentPersona: AgentPersona;

  constructor(config: AgentConfig) {
    this.config = { debug: false, ws: false, ...config };
    this.ai = new AI();
    this.currentPersona = config.persona || PERSONAS.SOLANA_TRADER;
    this.currentPersona.context = `${this.currentPersona.context}\n\n${GLOBAL_CONTEXT}`;

    this.PLUGIN_CONTEXT = `${GLOBAL_AVAILABLE_COMMANDS}`;

    this.config.plugins.forEach(plugin => {
      plugin.setAgent(this);

      const commandsXml = Object.entries(plugin.commands)
        .map(([name, cmd]) => {
          const paramsXml = Object.entries(cmd.params)
            .map(([paramName, defaultValue]) => `<${paramName}>${defaultValue}</${paramName}>`)
            .join('');
          return `<TASK> <PLUGIN>${plugin.name}</PLUGIN> <COMMAND>${name}</COMMAND> <PARAMS>${paramsXml}</PARAMS> <DESCRIPTION>${cmd.description}</DESCRIPTION> </TASK>`;
        })
        .join('\n');
      this.PLUGIN_CONTEXT += `\n${commandsXml}`;
    });
    
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

  log(message: string, plugin?: Plugin, taskId: string = '-1') {
    console.log(message);
    if (this.config.ws) {
      WSServer.log(message, plugin?.name || `agent - ${this.currentPersona.name}`, taskId);
    }
  }

  debug(message: string) {
    if (this.config.debug) {
      console.log(message);
    }
  }

  warn(message: string) {
    if (this.config.debug) {
      console.warn(message);
    }
  }

  error(message: string, err?: any) {
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

        const task: Task = {
          id: (this.tasks.length + tasks.length + 1).toString(),
          description,
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
      } else {
        // This is a normal task
        const descriptionMatch = taskContent.match(/<DESCRIPTION>(.*?)<\/DESCRIPTION>/);
        if (!descriptionMatch) {
          this.warn('Invalid task format, missing description');
          continue;
        }

        const task: Task = {
          id: (this.tasks.length + tasks.length + 1).toString(),
          description: descriptionMatch[1].trim(),
          status: 'pending',
          context: response
        };
        tasks.push(task);
      }
    }

    return tasks;
  }

  private addTask(task: Task): void {
    this.debug(`Adding task ${task.description}`);
    this.tasks.push(task);
  }

  private async executeTask(task: Task): Promise<void> {
    this.log(`[${task.id}] Executing task: ${task.description}`, undefined, task.id);
    task.status = 'in_progress';

    // Execute command if present
    let commandExecutionStatus = '';
    let commandResponse = '';
    if (task.command && task.plugin) {
      this.log(`[${task.id}] Executing command: ${task.command.name} with params: ${Object.entries(task.command.params).map(([k,v]) => `${k}=${v}`).join(',')}`, undefined, task.id);
      const commandXml = `<TASK> <PLUGIN>${task.plugin.name}</PLUGIN> <COMMAND>${task.command.name}</COMMAND> <PARAMS>${Object.entries(task.command.params).map(([k,v]) => `<${k}>${v}</${k}>`).join('')}</PARAMS> <DESCRIPTION>${task.description}</DESCRIPTION> </TASK>`;
      try {
        // TODO: get response from execute, add to context, make last 10 results available and made obvious to read
        commandResponse = await task.command.execute(task.command.params, task.id);
        task.command.hasExecuted = true;
        commandExecutionStatus = `\n\nPrevious task result: ${commandXml} was executed successfully. If you have another command to execute, proceed with that as your next task. If you have no more commands that need to be executed, feel free to continue the conversation naturally without any command tasks and DO NOT create a new task.`;
        this.debug(`[${task.id}] Successfully executed command`);
        this.log(`[${task.id}] Successfully executed command ${task.plugin.name} ${task.command.name}`, undefined, task.id);
      } catch (error) {
        commandExecutionStatus = `\n\nPrevious task result: ${commandXml} failed with error: ${error}`;
        this.error(`[${task.id}] Error executing command:`, error);
        this.log(`[${task.id}] Error executing command ${task.plugin.name} ${task.command.name}`, undefined, task.id);
      }
    }

    const conversationId = `task-${task.id}`;
    
    this.ai.createConversation(conversationId, task.id);

    const message = `${this.currentPersona.context}\n\n${this.PLUGIN_CONTEXT}\n\n${
      task.id === '1' 
        ? `Your first task: ${task.description}`
        : `Current task: ${task.description}${task.context ? `\n\nContext from previous task: ${task.context}` : ''}${commandExecutionStatus}\n\n${commandResponse ? `Command response THIS MAY HELP WITH NEW CONTEXT, READ CAREFULLY.: ${commandResponse}` : ''}`
    }`;

    this.debug(`[${task.id}] Sending message to AI: ${message}`);

    const response = await this.ai.sendMessage(conversationId, message);

    this.debug(`[${task.id}] AI response: ${response}`);
    
    // TODO: might want to add summary to response
    // Make it clear what tasks have been completed/added, whats left, whats in progress
    const newTasks = this.parseNewTasks(response);

    const tasksToAdd: Task[] = [];
    newTasks.forEach(newTask => {
      // For plugin tasks, check for duplicates
      if (newTask.plugin && newTask.command) {
        const isDuplicate = this.tasks.some(existingTask => 
          existingTask.plugin?.name === newTask.plugin?.name &&
          existingTask.command?.name === newTask.command?.name &&
          existingTask.description === newTask.description &&
          existingTask.command?.hasExecuted !== true
        );

        if (isDuplicate) {
          this.log(`[${task.id}] Duplicate task found, skipping: ${newTask.description}`, undefined, task.id);
          return;
        }
      }
      
      tasksToAdd.push(newTask);
    });

    // TODO: !! execute new tasks directly after adding them
    if(tasksToAdd.length > 0) {
      this.log(`[${task.id}] Adding new tasks: ${tasksToAdd.map(t => t.description).join(', ')}`, undefined, task.id);
      tasksToAdd.forEach(newTask => this.addTask(newTask));
    }

    task.status = 'completed';
    this.debug(`Completed task ${task.id}`); 
    this.log(`[${task.id}] Completed task`, undefined, task.id);
  }

  async start() {
    this.isRunning = true;
    this.debug('Agent starting...');
    
    while (this.isRunning) {
      const pendingTask = this.tasks.find(t => t.status === 'pending');
      
      if (pendingTask) {
        await this.executeTask(pendingTask);
      } else {
        // No pending tasks, analyze history to determine next steps
        this.log(`No pending tasks, analyzing history`);
      
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
      await new Promise(resolve => setTimeout(resolve, 5000));
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