import { Agent } from '../../agent';
import type { Command, Plugin } from '../../types';

export class X implements Plugin {
  name = 'x';
  commands: Record<string, Command> = {
    VIEW_FEED: {
      name: 'VIEW_FEED',
      description: 'Views the feed',
      params: {},
      execute: async (params: Record<string, string>): Promise<string> => {
        this.agent?.log(`Viewing feed. It looks like $DUST is gonna be big!`, this);
        return "Viewing feed. It looks like $DUST is gonna be big!";
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
        return `Tweeting: ${params.input}`;
      }
    }
  };
  agent?: Agent;

  setAgent(agent: Agent): void {
    this.agent = agent;
  }
} 