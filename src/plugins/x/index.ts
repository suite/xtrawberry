import type { Command } from '../../types';
import { BasePlugin } from '../../types/base-plugin';
import { sendToDiscordWebhook } from '../../utils/discord';

export class X extends BasePlugin {
  name = 'x';
  commands: Record<string, Command> = {
    VIEW_FEED: {
      name: 'VIEW_FEED',
      description: 'Views the feed',
      params: {},
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log('Viewing feed.', taskId);
        return "No content. Use scraper plugin to get content.";
      }
    },
    TWEET: {
      name: 'TWEET',
      description: 'Tweets a message',
      params: {
        "input": "tweet"
      },
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log(`Tweeting: ${params.input}`, taskId);
        
        // Send to Discord webhook for debugging
        await sendToDiscordWebhook(params.input, (msg) => this.error(msg, undefined, taskId));

        return `Tweeting: ${params.input}`;
      }
    }
  };
} 