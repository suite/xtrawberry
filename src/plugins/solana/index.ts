import { Agent } from '../../agent';
import type { Command, Plugin } from '../../types';

export class SolanaPlugin implements Plugin {
  name = 'solana';
  commands: Record<string, Command> = {
    CREATE_WALLET: {
      name: 'CREATE_WALLET',
      description: 'Creates a new wallet',
      params: {},
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.agent?.log(`[${taskId}] Creating wallet`, this);
        return "";
      }
    }
  };
  agent?: Agent;

  initialize(agent: Agent): void {
    this.agent = agent;
  }

} 