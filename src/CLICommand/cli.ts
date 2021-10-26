export interface ParsedArguments {
	// TODO: make parameterName to have type ParameterName
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[parameterName: string /** ParameterName */]: any;
}

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
	abstract opts(): ParsedArguments;
	abstract name(name: string): CliApiObject;
	abstract usage(usage: string): CliApiObject;
	abstract outputHelp(): void;
}

export type ActionCallback = (options: ParsedArguments) => Promise<ActionReturnType>;

export type ActionReturnType = number | void;
