export interface Command {
  name: string;
  description: string;
  params: Record<string, string>;
  execute: (args: Record<string, string>) => Promise<void>;
}

export interface Plugin {
  name: string;
  initialize(): Promise<void>;
  commands: Record<string, Command>;
}

export interface AgentPersona {
  name: string;
  initialContext: string;
  initialTaskDescription: string;
}

export interface AgentConfig {
  plugins: Plugin[];
  persona?: AgentPersona;
  debug?: boolean;
} 