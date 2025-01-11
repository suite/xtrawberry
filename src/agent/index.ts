import type { AgentConfig } from '../types';

export class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async start() {
    this.isRunning = true;
    console.log('Agent starting...');
    
    while (this.isRunning) {
      console.log('Agent running... checking for tasks');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Agent stopped');
  }
}

// Create and run the agent
const config: AgentConfig = {
  plugins: []  // Empty array of plugins for now
};

const agent = new Agent(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down...');
  agent.stop();
  process.exit(0);
});

// Start the agent
agent.start().catch(console.error); 