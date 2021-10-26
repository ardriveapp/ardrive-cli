import { ActionCallback, ActionReturnType, ParsedArguments } from './cli';

export class CLIAction {
	private _promiseInstance?: Promise<ActionReturnType>;
	private readonly _awaiterInstances: Promise<ActionReturnType>[] = [];

	constructor(
		private readonly actionCallback: ActionCallback = async (opts) => {
			// for testing propuses
			const optsAsUnknown = opts as unknown;
			const optsAsReturnType = optsAsUnknown as ActionReturnType;
			return optsAsReturnType;
		}
	) {}

	private get promiseInstance(): Promise<ActionReturnType> {
		if (!this._promiseInstance) {
			throw new Error(`There's no instance of a promise before calling it`);
		}
		return this._promiseInstance;
	}

	trigger(options: ParsedArguments): Promise<ActionReturnType> {
		this._promiseInstance = this.actionCallback(options);
		return this.promiseInstance.finally(this.resolveAwaiters.bind(this, options));
	}

	actionAwaiter(): Promise<ActionReturnType> {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;
		return new Promise(function (this: Promise<ActionReturnType>, resolve) {
			if (that._promiseInstance) {
				that.promiseInstance.then(resolve);
			} else {
				that._awaiterInstances.push(this);
			}
		});
	}

	private resolveAwaiters(options: ParsedArguments): void {
		while (this._awaiterInstances.length) {
			const awaiter = this._awaiterInstances.pop();
			Promise.resolve.bind(awaiter)(options);
		}
	}
}
