import type { Plugin } from '../../types';
export declare class X implements Plugin {
    name: string;
    initialize(): Promise<void>;
}
