/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { program } from 'commander';
import { CLIAction } from './action';
import { CliApiObject, ParsedParameters } from './cli';
import { Parameter, ParameterName, ParameterOverridenConfig } from './parameter';
import { ERROR_EXIT_CODE } from './constants';

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
		assertConjunctionParameters(commandDescriptor, options);
		commandDescriptor.action.trigger(options).then((exitCode) => {
			exitProgram(exitCode || 0);
		});
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
	// private _action: CLIAction;

	/**
	 * @param {CommandDescriptor} commandDescription an immutable representation of a command
	 * @param {string[]} argv a custom argv for testing purposes
	 */
	constructor(readonly commandDescription: CommandDescriptor, private readonly _program: CliApiObject = programApi) {
		_program.name('ardrive');
		_program.addHelpCommand(true);
		_program.usage('[command] [command-specific options]');
		_program.exitOverride();
		setCommanderCommand(this.commandDescription, this.program);
		CLICommand.allCommandInstances.push(this);
		commandDescription.action.actionAwaiter().finally(CLICommand.rejectPendingAwaiters);
	}

	public get action(): Promise<ParsedParameters> {
		return this.commandDescription.action.actionAwaiter();
	}

	// A singleton instance of the commander's program object
	private get program(): CliApiObject {
		return this._program;
	}

	public static parse(program: CliApiObject = programApi, argv: string[] = process.argv): void {
		try {
			program.parse(argv);
		} catch {
			exitProgram(ERROR_EXIT_CODE);
			this.rejectPendingAwaiters();
		}
	}

	private static rejectPendingAwaiters(): void {
		// reject all action awaiters that haven't run
		const theOtherCommandActions = CLICommand.allCommandInstances.map((cmd) => cmd.commandDescription.action);
		theOtherCommandActions.forEach((action) => action.wasNotTriggered());
	}

	/**
	 * For test purposes only
	 * @returns {CommandDescriptor[]} all declared command descriptors
	 */
	public static _getAllCommandDescriptors(): CommandDescriptor[] {
		return this.allCommandInstances.map((cmd) => cmd.commandDescription);
	}
}

function exitProgram(exitCode: number): void {
	process.exitCode = exitCode;
}
