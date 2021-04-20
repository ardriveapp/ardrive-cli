import prompts, { Answers, PromptObject } from 'prompts';
import { resolveFullPath, MAX_ATTEMPTS, TOO_MANY_ATTEMPTS_ERROR } from '../common';

export type Range = { min: number | null; max: number | null };
export type Choices = Array<{ title: string; value: any }>;
export interface Options {
	type?: string | Function;
	name?: string | Function;
	message?: string | Function;
	initial?: string | Function;
	format?: Function;
	onRender?(): string;
	onState?(): string;
	style?: 'default' | 'password' | 'invisible' | 'emoji';
}

export async function promptPath(message: string, config?: any): Promise<string> {
	let resolvedPath;
	while (!resolvedPath) {
		const prompter = new Prompter({
			message,
			type: 'text',
			name: 'path'
			// validate: validatePath
			// format: (v) => resolveFullPath(v).catch(() => v)
		});
		const result = await prompter.run(config);
		resolvedPath = await resolveFullPath(result.path);
	}
	return resolvedPath;
}

// async function validatePath(path: string) {
// 	const fullPath = await resolveFullPath(path);
// 	return !!fullPath;
// }

export async function promptPasswordConfirm(message: string, messageConfirm: string, range: Range): Promise<string> {
	const type = 'text';
	const style = 'password';
	const prompter = new Prompter([
		{
			message,
			type,
			style,
			name: 'password',
			validate: (value) => validatePassword(value, range)
		},
		{
			message: messageConfirm,
			type,
			style,
			name: 'password2'
		}
	]);
	for (let count = 0; count < MAX_ATTEMPTS; count++) {
		if (count != 0) {
			console.log('Passwords does not match, try again...');
		}
		const answers = await prompter.run();
		if (answers.password === answers.password2) {
			return answers.password;
		}
	}
	throw TOO_MANY_ATTEMPTS_ERROR;
}

export async function promptPassword(message: string, range: Range, config?: any): Promise<string> {
	const prompter = new Prompter({
		message,
		type: 'text',
		name: 'password',
		style: 'password',
		validate: (value) => validatePassword(value, range)
	});
	const promptResult = await prompter.run(config);
	return promptResult.password;
}

function validatePassword(value: string, range: Range): boolean | string {
	const min = range.min || 1;
	if (value.length < min) {
		return `Password must have at least ${min} character${min > 1 && 's'}`;
	} else {
		if (range.max && value.length > range.max) {
			return `Password length has a maximum limit of ${range.max} characters`;
		}
	}
	return true;
}

export async function promptYesNo(message: string, config?: any): Promise<boolean> {
	return await promptChoices(
		message,
		[
			{ title: 'Yes', value: true },
			{ title: 'No', value: false }
		],
		config
	);
}

export async function promptChoices(message: string, choices: Choices, config?: any): Promise<any> {
	const prompter = new Prompter({
		message,
		choices,
		type: 'select',
		name: 'choice'
	});
	const result = await prompter.run(config);
	return result.choice;
}

export async function promptText(message: string, config?: any): Promise<any> {
	const prompter = new Prompter({
		message,
		type: 'text',
		name: 'value'
	});
	const result = await prompter.run(config);
	return result.value;
}

// type PromptType =
// 	| 'text'
// 	| 'password'
// 	| 'invisible'
// 	| 'number'
// 	| 'confirm'
// 	| 'list'
// 	| 'toggle'
// 	| 'select'
// 	| 'multiselect'
// 	| 'autocompleteMultiselect'
// 	| 'autocomplete'
// 	| 'date';

export class Prompter {
	constructor(private opts: PromptObject | PromptObject[] = { type: 'text', name: 'result' }) {}

	run = async (opts?: PromptObject): Promise<Answers<any>> => {
		const result = await prompts(Object.assign({}, this.opts, opts));
		return result;
	};
}
