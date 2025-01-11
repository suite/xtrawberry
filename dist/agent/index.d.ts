import type { AgentConfig } from '../types';
export declare class Agent {
    private config;
    private isRunning;
    constructor(config: AgentConfig);
    start(): Promise<void>;
    stop(): void;
}
