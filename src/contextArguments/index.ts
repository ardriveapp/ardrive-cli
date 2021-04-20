import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Prompter, Choices } from '../prompts/prompters';
import { PromptObject } from 'prompts';

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
		debugger;
		if (argument) {
			// search for the value in yargs, else prompt for it
			let value;
			value = this.getArgumentValue(argument);
			const valid = argument.validate && argument.validate(value);
			if (typeof value === 'undefined' || !(valid === true || valid === undefined)) {
				const prompter = new Prompter({
					message: argument.humanReadableMessage,
					type: argument.type,
					name: argument.name,
					validate: argument.validate,
					choices: argument.choices
				} as PromptObject);
				const v = await prompter.run();
				value = v[argument.name];
				debugger;
			}
			if (argument.cacheable) {
				argument.cache = value;
			}
			if (argument.type === 'number') {
				value = Number(value);
			} else if (argument.type === 'boolean') {
				value == !!value;
			}
			return value;
		} else {
			const error = new Error(`Invalid argument ${argumentName}`);
			console.error(error.message);
			throw error;
		}
	}

	private getArgumentValue(argument: ArgumentConfig): string {
		const value =
			argument.commandLineFlags.reduce(
				(accumulator: string, flag: string): string => accumulator || (this.yargsInstance.argv[flag] as string),
				''
			) || argument.cache;
		return value;
	}
}

const argumentsInstance = new ContextArguments();

export default argumentsInstance;
export { PASSWORD_ARG, PASSWORD_REPEAT_ARG, USERNAME_ARG } from './arguments';
