/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Command } from 'commander';
import { CLIAction } from './action';
import { ActionReturnType, CliApiObject, ParsedArguments } from './cli';
import { ERROR_EXIT_CODE } from './constants';
import { Parameter, ParameterName, ParameterOverridenConfig } from './parameter';

export type CommandName = string;
export interface CommandDescriptor {
	name: CommandName;
	parameters: (ParameterName | ParameterOverridenConfig)[];
	action(options: ParsedArguments): Promise<number | void>;
}

const program: CliApiObject = new Command() as CliApiObject;
program.name('ardrive');
program.addHelpCommand(true);
program.usage('[command] [command-specific options]');

/**
 * @name setCommanderCommand
 * @param {CommandDescriptor} commandDescriptor the description of the command to be set
 * @param {CliApiObject} program the instance of the commander class
 * This function is the responsible to tell the third party library to declare a command
 */
function setCommanderCommand(commandDescriptor: CommandDescriptor, program: CliApiObject): CLIAction {
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
	const action = new CLIAction(commandDescriptor.action);
	command = command.action(async (options) => {
		await (async function () {
			assertConjunctionParameters(commandDescriptor, options);
			const exitCode = await action.trigger(options);
			exitProgram(exitCode || 0);
		})().catch((err) => {
			console.log(err.message);
			exitProgram(ERROR_EXIT_CODE);
		});
	});
	return action;
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
	private static allCommandDescriptors: CommandDescriptor[] = [];
	private _runningAction: CLIAction;

	/**
	 * @param {CommandDescriptor} commandDescription an immutable representation of a command
	 * @param {string[]} argv a custom argv for testing purposes
	 */
	constructor(private readonly commandDescription: CommandDescriptor, private readonly _program?: CliApiObject) {
		CLICommand.allCommandDescriptors.push(commandDescription);
		this._runningAction = setCommanderCommand(this.commandDescription, this.program);
	}

	public get runningAction(): Promise<ActionReturnType> {
		return this._runningAction.actionAwaiter();
	}

	// A singleton instance of the commander's program object
	public static get program(): CliApiObject {
		// TODO: make me private when index.ts is fully de-coupled from commander library
		return program;
	}

	private get program(): CliApiObject {
		return this._program || CLICommand.program;
	}

	public static parse(program: CliApiObject = this.program, argv: string[] = process.argv): void {
		program.parse(argv);
	}

	/**
	 * For test purposes only
	 * @returns {CommandDescriptor[]} all declared command descriptors
	 */
	public static _getAllCommandDescriptors(): CommandDescriptor[] {
		return this.allCommandDescriptors;
	}
}

function exitProgram(exitCode: number): void {
	process.exitCode = exitCode;
}
