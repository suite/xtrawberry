import type { Command } from '../../types';
import { BasePlugin } from '../../types/base-plugin';
import { tavily } from '@tavily/core';

export class ScraperPlugin extends BasePlugin {
  name = 'scraper';
  commands: Record<string, Command> = {
    SEARCH: {
      name: 'SEARCH', 
      description: 'Searches based on the provided query',
      params: {
        query: ''  // Default empty query
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log(`Searching for: ${params.query}`, taskId);
        
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          this.warn('No TAVILY_API_KEY found in environment variables', taskId);
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

          /*
          need better sources:
          - https://www.bitget.com/news
          - https://cointelegraph.com/
          - https://www.coindesk.com/
          */
          
          return JSON.stringify(response, null, 2);
        } catch (error) {
          this.error(`Error during Tavily search`, error, taskId);
          return '';
        }
      }
    }
  };
} 