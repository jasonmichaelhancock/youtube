import Command from '@oclif/command';
export default abstract class extends Command {
    runLegacy(cmdArgs: any[]): void;
}
