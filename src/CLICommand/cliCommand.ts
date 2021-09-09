import { Command } from 'commander';

export type CommandName = string;
export type ParameterName = string;
export interface Parameter {
	aliases: ParameterName[];
	description: string;
	default?: string;
}

export interface CommandDescriptor {
	name: CommandName;
	parameters: Parameter[];
	action(options: any): void;
}

export class CLICommand {
	// A singleton instance of the commander's program object
	private static program: Command;
	private static _doneSettingCommands = false;

	constructor(private readonly commandDescription: CommandDescriptor, program?: Command) {
		if (!CLICommand.program) {
			CLICommand.program = program || new Command();
			// Set up command line option parsing
			//const validActions = ['create-drive', 'rename-drive', 'upload-file'];
			CLICommand.program.option('-h, --help', 'Get help');
			//program.option('create-drive', 'action to create a new drive (and its corresponding root folder)');
			CLICommand.program.addHelpCommand(false);
		}
		this.setCommand();
	}

	private setCommand(): void {
		if (CLICommand._doneSettingCommands) {
			// eslint-disable-next-line no-console
			console.log(
				`Won't set a command after parameters are parsed! \n${JSON.stringify(this.commandDescription, null, 4)}`
			);
			return;
		}
		this.setCommanderCommand();
	}

	private setCommanderCommand(): void {
		const command = CLICommand.program.command(this.commandDescription.name);
		this.commandDescription.parameters.forEach((parameter) => {
			const aliasesAsString = parameter.aliases.join(' ');
			command.option(aliasesAsString, parameter.description, parameter.default);
		});
		command.action(this.commandDescription.action);
	}

	public static doneSettingCommands(): void {
		CLICommand.program.parse(process.argv);
		CLICommand._doneSettingCommands = true;
	}
}
