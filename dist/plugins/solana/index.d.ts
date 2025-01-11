import type { Plugin } from '../../types';
export declare class SolanaPlugin implements Plugin {
    name: string;
    initialize(): Promise<void>;
}
