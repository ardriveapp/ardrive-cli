import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Prompter, Choices } from '../prompts/prompters';
import { PromptObject } from 'prompts';

const POSITIONAL_ARGUMENT_REGEX = /^\$(\d+)$/;
const UNDERSCORE = '_';
export interface ArgumentConfig {
	name: string;
	type: string;
	choices?: Choices;
	style?: 'password';
	commandLineFlags: string[];
	humanReadableMessage: string;
	humanReadableRetryMessage?: string;
	validate?(v: any): boolean | string;
	cacheable: boolean;
	cache?: any;
	help: string;
}

class ContextArguments {
	private ALL_ARGS: ArgumentConfig[] = [];
	private yargsInstance = yargs(hideBin(process.argv));

	public setArguments = (args: ArgumentConfig[]) => {
		args.forEach((a) => {
			this.setArgument(a);
		});
	};

	public setArgument = (arg: ArgumentConfig) => {
		this.ALL_ARGS.push(arg);
	};

	public async get(argumentName: string): Promise<any> {
		const argument = this.ALL_ARGS.find((a) => a.name === argumentName);
		const positionalArgument = argumentName.match(POSITIONAL_ARGUMENT_REGEX);
		let value;
		if (argument) {
			// search for the value in yargs, else prompt for it
			value = this.getArgumentValue(argument);
			const valid = argument.validate && argument.validate(value);
			if (typeof value === 'undefined' || !(valid === true || valid === undefined)) {
				value = await this.promptArgumentValue(argument);
			}
			if (argument.cacheable) {
				argument.cache = value;
			}
			if (argument.type === 'number') {
				value = Number(value);
			} else if (argument.type === 'boolean') {
				value = !!value;
			}
			return value;
		} else if (positionalArgument) {
			const index = Number.parseInt(positionalArgument[1]);
			value = this.getPositionalArgument(index);
		} else {
			const error = new Error(`Invalid argument ${argumentName}`);
			console.error(error.message);
			throw error;
		}
		return value;
	}

	private getPositionalArgument(argumentIndex: number) {
		const value = this.yargsInstance.argv[UNDERSCORE][argumentIndex - 1];
		return value;
	}

	private getArgumentValue(argument: ArgumentConfig): string {
		const value =
			argument.commandLineFlags.reduce(
				(accumulator: string, flag: string): string => accumulator || (this.yargsInstance.argv[flag] as string),
				''
			) || argument.cache;
		return value;
	}

	private async promptArgumentValue(argument: ArgumentConfig): Promise<string> {
		const prompter = new Prompter({
			message: argument.humanReadableMessage,
			type: argument.type,
			name: argument.name,
			validate: argument.validate,
			choices: argument.choices
		} as PromptObject);
		const v = await prompter.run();
		const value = v[argument.name];
		return value;
	}
}

const argumentsInstance = new ContextArguments();

export default argumentsInstance;
export { PASSWORD_ARG, PASSWORD_REPEAT_ARG, USERNAME_ARG } from './arguments';
