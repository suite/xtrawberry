import type { Command } from '../../types';
import { BasePlugin } from '../../types/base-plugin';
import { sendToDiscordWebhook } from '../../utils/discord';
import { Scraper } from 'agent-twitter-client';
import { Agent } from '../../agent';

export class X extends BasePlugin {
  name = 'x';
  private scraper: Scraper | null = null;

  override async initialize(agent: Agent): Promise<void> {
    super.initialize(agent);

    const username = process.env.X_USERNAME;
    const password = process.env.X_PASSWORD;
    const email = process.env.X_EMAIL;

    if (!username || !password || !email) {
      throw new Error('Missing required X credentials in environment variables');
    }

    try {
      this.scraper = new Scraper();
      await this.scraper.login(username, password, email, undefined, undefined, undefined, undefined);
      this.debug('Successfully logged into X', 'init');
    } catch (error) {
      this.error(`Failed to initialize X plugin: ${error}`, error, 'init');
      throw error;
    }
  }

  commands: Record<string, Command> = {
    VIEW_FEED: {
      name: 'VIEW_FEED',
      description: 'Views the feed',
      params: {},
      execute: async (params: Record<string, string>, taskId: string): Promise<string> => {
        this.log('Viewing feed.', taskId);
        
        if (!this.scraper) {
          throw new Error('X plugin not initialized');
        }
        
        try {
          const tweets = await this.scraper.fetchHomeTimeline(10, []);
          return tweets
            .filter(tweet => tweet?.core?.user_results?.result?.legacy?.screen_name && tweet?.legacy?.full_text)
            .map(tweet => `@${tweet.core.user_results.result.legacy.screen_name} tweeted: ${tweet.legacy.full_text}`)
            .join('\n');
        } catch (error) {
          this.error(`Failed to fetch feed: ${error}`, error, taskId);
          throw error;
        }
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