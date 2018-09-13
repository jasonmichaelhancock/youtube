import BaseLegacyCommand from '../BaseLegacyCommand';
declare const blankComponent = "blank-component";
declare const collectionComponent = "collection-component";
declare const rootGroup = "root-group";
declare const setup = "setup";
export default class Generate extends BaseLegacyCommand {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        [setup]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [blankComponent]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [collectionComponent]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        [rootGroup]: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: {
        name: string;
        required: boolean;
    }[];
    run(): Promise<void>;
}
export {};
