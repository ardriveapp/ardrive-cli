import { Command } from 'commander';
import { CliApiObject, ParsedArguments } from './cli';
import { Parameter, ParameterData, ParameterName } from './parameter';

export type CommandName = string;
export interface CommandDescriptor {
	name: CommandName;
	parameters: (ParameterName | (Partial<ParameterData> & Pick<ParameterData, 'name'>))[];
	action(options: ParsedArguments): void;
}

const program: CliApiObject = new Command() as CliApiObject;

// Set up command line option parsing
//const validActions = ['create-drive', 'rename-drive', 'upload-file'];
program.option('-h, --help', 'Get help');
//program.option('create-drive', 'action to create a new drive (and its corresponding root folder)');
program.addHelpCommand(false);

/**
 * @name serCommanderCommand
 * @param {CommandDescriptor} commandDescriptor the descripton of the command to be set
 * @param {CliApiObject} program the instance of the commander class
 * This function is the responsible to tell the third party library to declare a command
 */
function setCommanderCommand(commandDescriptor: CommandDescriptor, program: CliApiObject): void {
	let command: CliApiObject = program.command(commandDescriptor.name);
	commandDescriptor.parameters.forEach((p) => {
		const parameterName = (function () {
			if (typeof p === 'string') {
				return p;
			}
			return p.name;
		})();
		const config = (function () {
			if (typeof p === 'string') {
				return undefined;
			}
			const config: Partial<ParameterData> & Omit<ParameterData, 'name'> = Object.assign({}, p, {
				name: undefined
			});
			return config;
		})();
		const parameter = new Parameter(parameterName, config);
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
		assertConjunctionParameters(commandDescriptor, options);
		commandDescriptor.action(options);
	});
}

function assertConjunctionParameters(commandDescriptor: CommandDescriptor, options: any): void {
	const parameters = commandDescriptor.parameters;
	parameters.forEach((p) => {
		const parameterName = (function () {
			if (typeof p === 'string') {
				return p;
			}
			return p.name;
		})();
		const parameterValue = options[parameterName];
		if (parameterValue) {
			const parameter = new Parameter(parameterName);
			const forbidden = parameter.forbiddenParametersInConjunction;
			forbidden.forEach((forbiddenParameterName) => {
				const forbiddenParameterValue = options[forbiddenParameterName];
				if (forbiddenParameterValue) {
					throw new Error(
						`Parameter ${parameterName} cannot be used in conjunction with ${forbiddenParameterName}`
					);
				}
			});
			const required = parameter.requiredParametersInConjunction;
			required.forEach((requiredParameterName) => {
				const requiredParameterValue = options[requiredParameterName];
				if (!requiredParameterValue) {
					throw new Error(
						`Parameter ${parameterName} requires ${requiredParameterName} but it wasn't provided`
					);
				}
			});
		}
	});
}

export class CLICommand {
	private static _doneSettingCommands = false;
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
		if (CLICommand._doneSettingCommands) {
			throw new Error(
				`Won't set a command after parameters are parsed! \n${JSON.stringify(this.commandDescription, null, 4)}`
			);
		}
		// CLICommand.parameters.push(...this.commandDescription.parameters);
		setCommanderCommand(this.commandDescription, this.program);
	}

	public static parse(
		program: CliApiObject = this.program,
		argv = CLICommand.argv,
		doneSettingCommands = true
	): void {
		program.parse(argv);
		this._doneSettingCommands = doneSettingCommands;
	}
}
