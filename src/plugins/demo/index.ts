import type { Plugin, Command, Logger } from '../../types';

export class Demo implements Plugin {
  name = 'demo';
  logger!: Logger;
  commands: Record<string, Command> = {
    PRINT: {
      name: 'PRINT',
      description: 'Prints the input to the console',
      params: {
        input: 'test'  // Default value
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<void> => {
        this.logger.log(`[${taskId}] ${params.input}`);
      }
    }
  }

  async initialize(logger: Logger): Promise<void> {
    this.logger = {
      ...logger,
      log: (message: string) => logger.log(message, this)
    };
  }
} 