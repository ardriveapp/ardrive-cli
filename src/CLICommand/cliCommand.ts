// import Arweave from 'arweave';
import { Command } from 'commander';
// import { CommonContext } from './commonContext';
import { Parameter, ParameterName } from './parameter';

export type CommandName = string;
export interface CommandDescriptor {
	name: CommandName;
	parameters: ParameterName[];
	action(options: any): void;
}

const program = new Command();

// Set up command line option parsing
//const validActions = ['create-drive', 'rename-drive', 'upload-file'];
program.option('-h, --help', 'Get help');
//program.option('create-drive', 'action to create a new drive (and its corresponding root folder)');
program.addHelpCommand(false);

function setCommanderCommand(commandDescriptor: CommandDescriptor, program: Command): void {
	const command = program.command(commandDescriptor.name);
	commandDescriptor.parameters.forEach((parameterName) => {
		const parameter = new Parameter(parameterName);
		const aliasesAsString = parameter.aliases.join(' ');
		const paramType = (function () {
			if (parameter.type === 'array') {
				return `<...${parameterName}>`;
			} else if (parameter.type === 'boolean') {
				return '';
			}
			return `<${parameterName}>`;
		})();
		command.option(`${aliasesAsString} ${paramType}`, parameter.description, parameter.default);
	});
	command.action((options) => {
		commandDescriptor.action(options);
	});
}

export class CLICommand {
	// A singleton instance of the commander's program object
	public static get program(): Command {
		// TODO: make me private when index.ts is fully de-coupled from commander library
		return program;
	}
	// private static parameters: Parameter[] = [];
	private static _doneSettingCommands = false;

	constructor(private readonly commandDescription: CommandDescriptor) {
		this.setCommand();
	}

	private setCommand(): void {
		if (!CLICommand.program) {
			throw new Error(`Commander program instance is not set!`);
		}
		if (CLICommand._doneSettingCommands) {
			throw new Error(
				`Won't set a command after parameters are parsed! \n${JSON.stringify(this.commandDescription, null, 4)}`
			);
		}
		// CLICommand.parameters.push(...this.commandDescription.parameters);
		setCommanderCommand(this.commandDescription, CLICommand.program);
	}

	public static parse(): void {
		CLICommand.program.parse(process.argv);
		CLICommand._doneSettingCommands = true;
	}
}
