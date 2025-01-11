import type { Plugin } from '../../types';
export declare class ScraperPlugin implements Plugin {
    name: string;
    initialize(): Promise<void>;
}
