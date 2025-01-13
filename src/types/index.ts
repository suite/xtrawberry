import { Agent } from "../agent";

export interface Command {
  name: string;
  description: string;
  params: Record<string, string>;
  execute: (args: Record<string, string>, taskId: string) => Promise<string>;
  hasExecuted?: boolean;
}

export interface Plugin {
  name: string;
  commands: Record<string, Command>;
  agent?: Agent;
  setAgent(agent: Agent): void;
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