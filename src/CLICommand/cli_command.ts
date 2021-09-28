import { Command } from 'commander';
import { CliApiObject, ParsedArguments } from './cli';
import { Parameter, ParameterName } from './parameter';

export type CommandName = string;
export interface CommandDescriptor {
	name: CommandName;
	parameters: ParameterName[];
	action(options: ParsedArguments): void;
}

const program: CliApiObject = new Command() as CliApiObject;

// Set up command line option parsing
program.option('-h, --help', 'Get help');
program.addHelpCommand(false);

/**
 * @name serCommanderCommand
 * @param {CommandDescriptor} commandDescriptor the description of the command to be set
 * @param {CliApiObject} program the instance of the commander class
 * This function is the responsible to tell the third party library to declare a command
 */
function setCommanderCommand(commandDescriptor: CommandDescriptor, program: CliApiObject): void {
	let command: CliApiObject = program.command(commandDescriptor.name);
	commandDescriptor.parameters.forEach((parameterName) => {
		const parameter = new Parameter(parameterName);
		const aliasesAsString = parameter.aliases.join(' ');
		const paramType = (function () {
			if (parameter.type === 'array') {
				return `<${parameterName}...>`;
			} else if (parameter.type === 'boolean') {
				return '';
			}
			return `<${parameterName}>`;
		})();
		const optionArguments = [`${aliasesAsString} ${paramType}`, parameter.description, parameter.default] as const;
		if (parameter.required) {
			command.requiredOption(...optionArguments);
		} else {
			command.option(...optionArguments);
		}
	});
	command = command.action((options) => {
		commandDescriptor.action(options);
	});
}

export class CLICommand {
	private static _argv?: string[]; // Custom argv vector for testing purposes

	/**
	 * @param {CommandDescriptor} commandDescription an immutable representation of a command
	 * @param {string[]} argv a custom argv for testing purposes
	 */
	constructor(private readonly commandDescription: CommandDescriptor, private readonly _program?: CliApiObject) {
		this.setCommand();
	}

	public static set argv(argv: string[]) {
		if (!this._argv) {
			this._argv = argv;
		}
	}

	public static get argv(): string[] {
		return this._argv || process.argv;
	}

	// A singleton instance of the commander's program object
	public static get program(): CliApiObject {
		// TODO: make me private when index.ts is fully de-coupled from commander library
		return program;
	}

	private get program(): CliApiObject {
		return this._program || CLICommand.program;
	}

	private setCommand(): void {
		setCommanderCommand(this.commandDescription, this.program);
	}

	public static parse(program: CliApiObject = this.program, argv = CLICommand.argv): void {
		program.parse(argv);
	}
}
