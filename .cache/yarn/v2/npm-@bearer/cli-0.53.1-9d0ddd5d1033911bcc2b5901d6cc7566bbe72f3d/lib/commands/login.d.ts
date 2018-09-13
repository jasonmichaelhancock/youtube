import { flags } from '@oclif/command';
import BaseLegacyCommand from '../BaseLegacyCommand';
export default class Login extends BaseLegacyCommand {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        email: flags.IOptionFlag<string>;
    };
    static args: never[];
    run(): Promise<void>;
}
