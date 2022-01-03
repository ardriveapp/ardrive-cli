/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { program } from 'commander';
import { CLIAction } from './action';
import { CliApiObject, ExitCode, ParsedParameters } from './cli';
import { ERROR_EXIT_CODE } from './error_codes';
import { Parameter, ParameterName, ParameterOverridenConfig } from './parameter';

export type CommandName = string;
export interface CommandDescriptor {
	name: CommandName;
	parameters: (ParameterName | ParameterOverridenConfig)[];
	action: CLIAction;
}

const programAsUnknown: unknown = program;
const programApi: CliApiObject = programAsUnknown as CliApiObject;

/**
 * @name setCommanderCommand
 * @param {CommandDescriptor} commandDescriptor the description of the command to be set
 * @param {CliApiObject} program the instance of the commander class
 * This function is the responsible to tell the third party library to declare a command
 */
function setCommanderCommand(commandDescriptor: CommandDescriptor, program: CliApiObject): void {
	let command: CliApiObject = program.command(commandDescriptor.name);
	const parameters = commandDescriptor.parameters.map((param) => new Parameter(param));
	parameters.forEach((parameter) => {
		const aliasesAsString = parameter.aliases.join(' ');
		const paramTypeString = (function () {
			if (parameter.type === 'array') {
				return ` <${parameter.name}...>`;
			} else if (parameter.type === 'boolean') {
				return '';
			}
			return ` <${parameter.name}>`;
		})();
		const optionArguments = [
			`${aliasesAsString}${paramTypeString}`,
			parameter.description,
			parameter.default
		] as const;
		if (parameter.required) {
			command.requiredOption(...optionArguments);
		} else {
			command.option(...optionArguments);
		}
	});
	command = command.action((options) => {
		try {
			assertConjunctionParameters(commandDescriptor, options);
			commandDescriptor.action.trigger(options).then((exitCode) => {
				exitProgram(exitCode || 0);
			});
		} catch (e) {
			console.error(`Error: ${e.message}`);
			exitProgram(ERROR_EXIT_CODE);
		}
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertConjunctionParameters(commandDescriptor: CommandDescriptor, options: any): void {
	const parameters = commandDescriptor.parameters;
	parameters.forEach((param) => {
		const parameter = new Parameter(param);
		const parameterName = parameter.name;
		const parameterValue = options[parameterName];
		if (parameterValue) {
			assertRequired(parameter, options);
			assertForbidden(parameter, options);
		}
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertRequired(parameter: Parameter, options: any): void {
	const parameterName = parameter.name;
	const required = parameter.requiredParametersInConjunction;
	required.forEach((requiredParameterName) => {
		const requiredParameterValue = options[requiredParameterName];
		if (!requiredParameterValue) {
			throw new Error(`Parameter ${parameterName} requires ${requiredParameterName} but it wasn't provided`);
		}
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertForbidden(parameter: Parameter, options: any): void {
	const parameterName = parameter.name;
	const forbidden = parameter.forbiddenParametersInConjunction;
	forbidden.forEach((forbiddenParameterName) => {
		const forbiddenParameterValue = options[forbiddenParameterName];
		if (forbiddenParameterValue) {
			throw new Error(`Parameter ${parameterName} cannot be used in conjunction with ${forbiddenParameterName}`);
		}
	});
}

export class CLICommand {
	private static allCommandInstances: CLICommand[] = [];

	/**
	 * @param {CommandDescriptor} commandDescription an immutable representation of a command
	 * @param {string[]} argv a custom argv for testing purposes
	 */
	constructor(readonly commandDescription: CommandDescriptor, program: CliApiObject = programApi) {
		program.name('ardrive');
		program.addHelpCommand(true);
		program.usage('[command] [command-specific options]');
		// Override the commander's default exit (process.exit()) to avoid abruptly interrupting the script execution
		program.exitOverride();
		setCommanderCommand(this.commandDescription, program);
		CLICommand.allCommandInstances.push(this);
	}

	public get action(): Promise<ParsedParameters> {
		return this.commandDescription.action.actionAwaiter();
	}

	public static parse(program: CliApiObject = programApi, argv: string[] = process.argv): void {
		program.parse(argv);
		this.rejectNonTriggeredAwaiters();
	}

	private static rejectNonTriggeredAwaiters(): void {
		// reject all action awaiters that haven't run
		const theOtherCommandActions = CLICommand.getAllCommandDescriptors().map((descriptor) => descriptor.action);
		theOtherCommandActions.forEach((action) => action.wasNotTriggered());
	}

	/**
	 * @returns {CommandDescriptor[]} all declared command descriptors
	 */
	public static getAllCommandDescriptors(): CommandDescriptor[] {
		return this.allCommandInstances.map((cmd) => cmd.commandDescription);
	}
}

function exitProgram(exitCode: ExitCode): void {
	process.exitCode = exitCode;
}
