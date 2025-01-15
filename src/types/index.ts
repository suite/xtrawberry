import { Agent } from "../agent";

export interface Command {
  name: string;
  description: string;
  params: Record<string, string>;
  execute: (args: Record<string, string>, taskId: string) => Promise<string>;
  hasExecuted?: boolean;
  response?: string;
  status?: 'success' | 'failed';
}

export type NewTask = {
  description: string;
  context?: string;
  command?: Pick<Command, 'params' | 'execute' | 'name' | 'hasExecuted' | 'response' | 'status'>;
  plugin?: Plugin;
}

export interface Task extends NewTask {
  id: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Plugin {
  name: string;
  commands: Record<string, Command>;
  agent?: Agent;
  initialize(agent: Agent): Promise<void>;
}

export interface AgentPersona {
  name: string;
  context: string;
  initialTaskDescription: string;
}

export interface AgentConfig {
  plugins: Plugin[];
  persona?: AgentPersona;
  debug?: boolean;
  ws?: boolean;
} 