import type { Logger, Plugin } from '../../types';

export class X implements Plugin {
  name = 'x';
  commands = {}

  async initialize(): Promise<void> {}
} 