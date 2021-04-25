import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Prompter, Choices, promptPath } from '../prompts/prompters';
import { PromptObject } from 'prompts';

export const WALLET_TAG = 'wallet';
export const USER_TAG = 'user';
export const ECHO_TAG = 'echo';
export const ALL_TAGS = [USER_TAG, ECHO_TAG, WALLET_TAG];

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

	public setArguments = (args: ArgumentConfig[]): void => {
		args.forEach((a) => {
			this.setArgument(a);
		});
	};

	public setArgument = (arg: ArgumentConfig): void => {
		this.ALL_ARGS.push(arg);
	};

	public async get(argumentName: string): Promise<any> {
		const argument: false | ArgumentConfig = await this.findArgument(argumentName).catch(() => {
			// console.log(e);
			return false;
		});
		const positionalArgument = argumentName.match(POSITIONAL_ARGUMENT_REGEX);
		let value: any;
		let err: false | Error = false;
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
		} else if (positionalArgument) {
			// search for positional argument
			try {
				const index = Number.parseInt(positionalArgument[1]);
				value = this.getPositionalArgument(index);
			} catch (e) {
				err = new Error(
					`Expected positional argument index to be an integer, but got "${positionalArgument[1]}"`
				);
			}
		} else {
			err = new Error(`Invalid argument ${argumentName}`);
		}
		if (err instanceof Error) {
			throw err;
		}
		return value;
	}

	public setArgumentCache = (argumentName: string, value: any) => {
		return this.findArgument(argumentName).then((argument) => {
			argument.cache = value;
		});
	};

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

	private async findArgument(name: string): Promise<ArgumentConfig> {
		const argument = this.ALL_ARGS.find((a) => a.name === name);
		if (!argument) {
			throw new Error(`No such argument ${name}`);
		}
		return argument;
	}

	private async promptArgumentValue(argument: ArgumentConfig): Promise<string> {
		if (argument.type === 'path') {
			return await promptPath(argument.name);
		}
		const prompter = new Prompter({
			message: argument.humanReadableMessage,
			type: argument.type,
			style: argument.style,
			name: argument.name,
			validate: argument.validate,
			choices: argument.choices
		} as PromptObject);
		const v = await prompter.run();
		const value = v[argument.name];
		return value;
	}
}

export default new ContextArguments();
export { PASSWORD_ARG, PASSWORD_REPEAT_ARG, USERNAME_ARG } from './arguments';
