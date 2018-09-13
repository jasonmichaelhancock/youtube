import BaseLegacyCommand from '../BaseLegacyCommand';
declare const noOpen = "no-open";
declare const noInstall = "no-install";
declare const noWatcher = "no-watcher";
export default class Start extends BaseLegacyCommand {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        [noOpen]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [noInstall]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [noWatcher]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: never[];
    run(): Promise<void>;
}
export {};
