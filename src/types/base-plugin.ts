import { Agent } from '../agent';
import { Plugin, Command } from './index';

export abstract class BasePlugin implements Plugin {
  abstract name: string;
  abstract commands: Record<string, Command>;
  agent?: Agent;

  initialize(agent: Agent): void {
    this.agent = agent;
  }

  protected log(message: string, taskId: string): void {
    this.agent?.log(message, this, taskId);
  }

  protected warn(message: string, taskId: string): void {
    this.agent?.warn(message, this, taskId);
  }

  protected error(message: string, err: any, taskId: string): void {
    this.agent?.error(message, err, this, taskId);
  }
} 