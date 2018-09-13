import * as ts from 'typescript';
export declare type TranpilerOptions = {
    ROOT_DIRECTORY?: string;
    watchFiles?: boolean;
    buildFolder?: string;
    srcFolder?: string;
    verbose?: boolean;
    tagNamePrefix?: string;
};
export default class Transpiler {
    private service;
    private rootFileNames;
    private subscribers;
    private readonly ROOT_DIRECTORY;
    private watchFiles;
    private buildFolder;
    private srcFolder;
    private verbose;
    private files;
    private metadata;
    private compilerOptionsts;
    constructor(options?: Partial<TranpilerOptions>);
    run(): void;
    emitFiles: () => void;
    refresh(): void;
    stop(): void;
    clearWatchers(): void;
    on(event: string, callback: () => void): void;
    private trigger;
    readonly transformers: ts.CustomTransformers;
    emitFile: (fileName: string) => void;
    logErrors(fileName: string): void;
    private readonly BUILD_DIRECTORY;
    private readonly BUILD_SCR_DIRECTORY;
    private readonly VIEWS_DIRECTORY;
}
