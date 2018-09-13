import BaseLegacyCommand from '../BaseLegacyCommand';
declare const viewsOnly = "views-only";
declare const intentsOnly = "intents-only";
export default class Deploy extends BaseLegacyCommand {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        [viewsOnly]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [intentsOnly]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: never[];
    run(): Promise<void>;
}
export {};
