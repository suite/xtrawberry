export interface Logger {
  debug(message: string): void;
  warn(message: string): void;
  error(message: string, err?: any): void;
  log(message: string): void;
}

export interface Command {
  name: string;
  description: string;
  params: Record<string, string>;
  execute: (args: Record<string, string>) => Promise<void>;
}

export interface Plugin {
  name: string;
  initialize(logger: Logger): Promise<void>;
  commands: Record<string, Command>;
  logger?: Logger; // TODO: make required
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