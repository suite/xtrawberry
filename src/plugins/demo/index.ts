import { Agent } from '../../agent';
import type { Plugin, Command } from '../../types';

export class Demo implements Plugin {
  name = 'demo';
  commands: Record<string, Command> = {
    PRINT: {
      name: 'PRINT',
      description: 'Prints the input to the console',
      params: {
        input: 'test'  // Default value
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.agent?.log(`[${taskId}] ${params.input}`, this);
        return "test";
      }
    }
  };
  agent?: Agent;

  initialize(agent: Agent): void {
    this.agent = agent;
  }
} 