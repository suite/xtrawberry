export interface Plugin {
  name: string;
  initialize(): Promise<void>;
}

export interface AgentConfig {
  plugins: Plugin[];
} 