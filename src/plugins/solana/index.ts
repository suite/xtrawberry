import type { Plugin } from '../../types';

export class SolanaPlugin implements Plugin {
  name = 'solana';
  commands = {}

  async initialize(): Promise<void> {}
} 