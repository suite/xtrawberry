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
      execute: async (params: Record<string, string>): Promise<void> => {
        console.log("COMING FROM PLUGIN", params.input);
      }
    }
  }

  async initialize(): Promise<void> {}
} 