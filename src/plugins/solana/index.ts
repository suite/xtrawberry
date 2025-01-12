import type { Logger, Plugin } from '../../types';

export class SolanaPlugin implements Plugin {
  name = 'solana';
  logger!: Logger;
  commands = {
    CREATE_WALLET: {
      name: 'CREATE_WALLET',
      description: 'Creates a new wallet',
      params: {},
      execute: async (params: Record<string, string>): Promise<void> => {
        this.logger.log(`Creating wallet`);
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