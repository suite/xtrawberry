import type { Plugin } from '../../types';

export class ScraperPlugin implements Plugin {
  name = 'scraper';
  commands = {}

  async initialize(): Promise<void> {}
} 