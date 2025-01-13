import { Agent } from '../../agent';
import type { Plugin, Command } from '../../types';

export class ScraperPlugin implements Plugin {
  name = 'scraper';
  commands: Record<string, Command> = {
    SEARCH: {
      name: 'SEARCH', 
      description: 'Searches based on the provided query',
      params: {
        query: ''  // Default empty query
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.agent?.log(`[${taskId}] Searching for: ${params.query}`, this);
        return "$DUST looks great!";
      }
    }
  };
  agent?: Agent;

  setAgent(agent: Agent): void {
    this.agent = agent;
  }
} 