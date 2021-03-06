import * as Config from '@oclif/config';
import * as Parser from '@oclif/parser';
import * as flags from './flags';
export default abstract class Command {
    argv: string[];
    config: Config.IConfig;
    static _base: string;
    static id: string;
    static title: string | undefined;
    static description: string | undefined;
    static hidden: boolean;
    static usage: string | string[] | undefined;
    static help: string | undefined;
    static aliases: string[];
    static strict: boolean;
    static parse: boolean;
    static flags?: flags.Input<any>;
    static args?: Parser.args.IArg[];
    static plugin: Config.IPlugin | undefined;
    static examples: string[] | undefined;
    static parserOptions: {};
    /**
     * instantiate and run the command
     */
    static run: Config.Command.Class['run'];
    id: string | undefined;
    protected debug: (...args: any[]) => void;
    constructor(argv: string[], config: Config.IConfig);
    readonly ctor: typeof Command;
    _run<T>(): Promise<T | undefined>;
    exit(code?: number): never;
    warn(input: string | Error): void;
    error(input: string | Error, options: {
        code?: string;
        exit: false;
    }): void;
    error(input: string | Error, options?: {
        code?: string;
        exit?: number;
    }): never;
    log(message?: string, ...args: any[]): void;
    /**
     * actual command run code goes here
     */
    abstract run(): Promise<any>;
    protected init(): Promise<any>;
    protected parse<F, A extends {
        [name: string]: any;
    }>(options?: Parser.Input<F>, argv?: string[]): Parser.Output<F, A>;
    protected catch(err: any): Promise<any>;
    protected finally(_: Error | undefined): Promise<any>;
    protected _help(): never;
    protected _helpOverride(): boolean;
    protected _version(): never;
}
