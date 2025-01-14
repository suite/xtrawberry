import type { Command } from '../../types';
import { BasePlugin } from '../../types/base-plugin';

export class SolanaPlugin extends BasePlugin {
  name = 'solana';
  commands: Record<string, Command> = {
    CREATE_WALLET: {
      name: 'CREATE_WALLET',
      description: 'Creates a new wallet',
      params: {},
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log('Creating wallet', taskId);
        return "";
      }
    }
  };
} 