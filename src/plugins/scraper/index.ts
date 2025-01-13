import { Agent } from '../../agent';
import type { Plugin, Command } from '../../types';
import { tavily } from '@tavily/core';

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
        
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          this.agent?.warn('No TAVILY_API_KEY found in environment variables');
          return '';
        }

        try {
          const client = tavily({ apiKey });
          const response = await client.search(params.query, {
            includeAnswer: true,
            maxResults: 5,
            topic: "news",
            searchDepth: "advanced",
            includeImages: false,
            days: 3,
            includeDomains: []            
          });

          this.agent?.log(`[${taskId}] Tavily response from ${params.query}: ${JSON.stringify(response, null, 2)}`, this);
          
          return JSON.stringify(response, null, 2);
        } catch (error) {
          this.agent?.error(`Error during Tavily search: ${error}`);
          return '';
        }
      }
    }
  };
  agent?: Agent;

  setAgent(agent: Agent): void {
    this.agent = agent;
  }
} 