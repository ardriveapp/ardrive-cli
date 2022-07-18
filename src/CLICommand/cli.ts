import { CommanderError } from 'commander';
import { ParameterName } from './parameter';

export type ParsedParameters = Record<ParameterName, unknown>;

/**
 * @name CliApiObject
 * abstract class intended to help encapsulate the cli api object
 * also used for mocking in tests
 */
export abstract class CliApiObject {
	abstract arguments(names: string): CliApiObject;
	abstract action(action: ActionCallback): CliApiObject;
	abstract option(aliases: string, description: string, defaultValue?: string | boolean): CliApiObject;
	abstract requiredOption(aliases: string, description: string, defaultValue?: string | boolean): CliApiObject;
	abstract command(commandName: string): CliApiObject;
	abstract parse(...args: [program: CliApiObject] | [argv: string[]]): void;
	abstract addHelpCommand(addHelp: boolean): void;
	abstract opts(): ParsedParameters;
	abstract name(name: string): CliApiObject;
	abstract usage(usage: string): CliApiObject;
	abstract outputHelp(): void;
	abstract exitOverride(callback?: (commanderError: CommanderError) => void): CliApiObject;
	abstract version(str: string, flags?: string, description?: string): CliApiObject;
}

export type ActionCallback = (options: ParsedParameters) => ActionReturnType; // commander action callback

export type AsyncActionCallback = (options: ParsedParameters) => Promise<ActionReturnType>;

export type ActionReturnType = ExitCode | void;

export type ExitCode = number;
