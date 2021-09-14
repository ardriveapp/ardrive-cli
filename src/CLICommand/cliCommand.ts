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
	// debugger;
	let command: Command = program.command(commandDescriptor.name);
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
		command = command.option(`${aliasesAsString} ${paramType}`, parameter.description, parameter.default);
	});
	command = command.action((options) => {
		commandDescriptor.action(options);
	});
}

export class CLICommand {
	private static _doneSettingCommands = false;
	private static _argv?: string[]; // Custom argv vector for testing propuse

	/**
	 * @param {CommandDescriptor} commandDescription an immputable representation of a command
	 * @param {string[]} argv a custom argv for testing propuses
	 */
	constructor(private readonly commandDescription: CommandDescriptor, private readonly _program?: Command) {
		this.setCommand();
	}

	public static set argv(argv: string[]) {
		if (!this._argv) {
			this._argv = argv;
		}
	}

	public static get argv(): string[] {
		if (this._argv) {
			return this._argv;
		}
		return process.argv;
	}

	// A singleton instance of the commander's program object
	public static get program(): Command {
		// TODO: make me private when index.ts is fully de-coupled from commander library
		return program;
	}

	private get program(): Command {
		return this._program || CLICommand.program;
	}

	private setCommand(): void {
		if (CLICommand._doneSettingCommands) {
			throw new Error(
				`Won't set a command after parameters are parsed! \n${JSON.stringify(this.commandDescription, null, 4)}`
			);
		}
		// CLICommand.parameters.push(...this.commandDescription.parameters);
		setCommanderCommand(this.commandDescription, this.program);
	}

	public static parse(program: Command = this.program): void {
		// debugger;
		program.parse(CLICommand.argv);
		this._doneSettingCommands = true;
	}
}
