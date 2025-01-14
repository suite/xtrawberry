import type { Command } from '../../types';
import { BasePlugin } from '../../types/base-plugin';

export class Demo extends BasePlugin {
  name = 'demo';
  commands: Record<string, Command> = {
    PRINT: {
      name: 'PRINT',
      description: 'Prints the input to the console',
      params: {
        input: 'test'  // Default value
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log(params.input, taskId);
        return "test";
      }
    }
  };
} 