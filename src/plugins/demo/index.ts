import type { Plugin } from '../../types';

export class Demo implements Plugin {
  name = 'demo';

  async initialize(): Promise<void> {
    // Initialization logic will go here
  }
} 