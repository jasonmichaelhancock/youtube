export declare type ComponentMetadata = {
    classname: string;
    isRoot: boolean;
    initialTagName: string;
    finalTagName: string;
    group?: string;
    imports?: Array<string>;
};
export declare type Metadata = {
    components: Array<ComponentMetadata>;
    prefix?: string;
    suffix?: string;
};
export declare type TransformerOptions = {
    verbose?: true;
    metadata?: Metadata;
};
export declare type FileTransformerOptions = TransformerOptions & {
    outDir: string;
};
export declare type SourceCodeTransformerOptions = TransformerOptions & {
    srcDirectory: string;
    buildDirectory: string;
};
