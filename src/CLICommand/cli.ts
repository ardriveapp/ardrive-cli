export interface ParsedArguments {
	// TODO: make parameterName to have type ParameterName
	[parameterName: string /** ParameterName */]: any;
}
/**
 * @name CliApiObject
 * abstract class intended to help encapsulate the cli api object
 * also used for mocking in tests
 */
export abstract class CliApiObject {
	abstract arguments(names: string): CliApiObject;
	abstract action(action: (options: ParsedArguments) => void): CliApiObject;
	abstract option(aliases: string, description: string, defaultValue?: string | boolean): CliApiObject;
	abstract requiredOption(aliases: string, description: string, defaultValue?: string | boolean): CliApiObject;
	abstract command(commandName: string): CliApiObject;
	abstract parse(...args: [program: CliApiObject] | [argv: string[]]): void;
	abstract addHelpCommand(addHelp: boolean): void;
	abstract opts(): ParsedArguments;
}
