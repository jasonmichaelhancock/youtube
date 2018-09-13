import BaseLegacyCommand from '../BaseLegacyCommand';
export default class Link extends BaseLegacyCommand {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    static args: {
        name: string;
        required: boolean;
    }[];
    run(): Promise<void>;
}
