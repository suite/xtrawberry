import { Agent } from '../../agent';
import type { Command, Plugin } from '../../types';
import { sendToDiscordWebhook } from '../../utils/discord';

export class X implements Plugin {
  name = 'x';
  commands: Record<string, Command> = {
    VIEW_FEED: {
      name: 'VIEW_FEED',
      description: 'Views the feed',
      params: {},
      execute: async (params: Record<string, string>): Promise<string> => {
        this.agent?.log(`Viewing feed.`, this);
        return "No content. Use scraper plugin to get content.";
      }
    },
    TWEET: {
      name: 'TWEET',
      description: 'Tweets a message',
      params: {
        "input": "tweet"
      },
      execute: async (params: Record<string, string>): Promise<string> => {
        this.agent?.log(`Tweeting: ${params.input}`, this);
        
        // Send to Discord webhook for debugging
        await sendToDiscordWebhook(params.input, (msg) => this.agent?.error(msg, this));

        return `Tweeting: ${params.input}`;
      }
    }
  };
  agent?: Agent;

  setAgent(agent: Agent): void {
    this.agent = agent;
  }
} 