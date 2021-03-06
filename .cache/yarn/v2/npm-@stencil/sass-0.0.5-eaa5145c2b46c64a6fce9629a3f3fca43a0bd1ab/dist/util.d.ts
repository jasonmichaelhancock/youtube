import * as d from './declarations';
export declare function usePlugin(fileName: string): boolean;
export declare function getRenderOptions(opts: d.PluginOptions, sourceText: string, fileName: string, context: d.PluginCtx): d.PluginOptions;
export declare function createResultsId(fileName: string): string;
export declare function normalizePath(str: string): string;
