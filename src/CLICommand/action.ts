import { ActionReturnType, AsyncActionCallback, ParsedParameters } from './cli';
import { ERROR_EXIT_CODE } from './error_codes';

export class CLIAction {
	private _promiseInstance?: Promise<ActionReturnType>;
	private _parsedParameters: ParsedParameters = {};
	private readonly _awaiterInstances: ((value?: ParsedParameters, error?: Error) => void)[] = [];
	private static _runningAction?: CLIAction;

	constructor(
		private readonly actionCallback: AsyncActionCallback = async (opts) => {
			/* a little hack here:
			 * for testing purposes, the callback defaults to a dummy promise which resolves into the parsed options
			 */
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

	private get parsedParameters(): ParsedParameters {
		if (!this._parsedParameters) {
			throw new Error(`There's no instance of a promise before calling it`);
		}
		return this._parsedParameters;
	}

	async trigger(params: ParsedParameters): Promise<ActionReturnType> {
		this._promiseInstance = this.actionCallback(params);
		CLIAction._runningAction = this;
		this._parsedParameters = params;
		return this.promiseInstance
			.then((exitCode) => {
				this.resolveAwaiters();
				return exitCode;
			})
			.catch((err: Error) => {
				this.rejectAwaiters(err);
				return ERROR_EXIT_CODE;
			});
	}

	actionAwaiter(): Promise<ParsedParameters> {
		if (this._promiseInstance) {
			// the promise was already called, resolve when the action is finished
			return this.promiseInstance.then(() => this.parsedParameters);
		} else {
			// queque the awaiter for when the promise is called
			const awaiter = new Promise<ParsedParameters>((resolve, reject) => {
				this._awaiterInstances.push(function (value?: ParsedParameters, error?: Error): void {
					if (value) {
						resolve(value);
					} else {
						reject(error);
					}
				});
			});
			return awaiter;
		}
	}

	private resolveAwaiters(): void {
		while (this._awaiterInstances.length) {
			const awaiter = this._awaiterInstances.pop();
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			awaiter!(this.parsedParameters);
		}
	}

	private rejectAwaiters(err: Error): void {
		while (this._awaiterInstances.length) {
			const awaiter = this._awaiterInstances.pop();
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			awaiter!(undefined, err);
		}
	}

	public setParsingError(err: Error): void {
		this.rejectAwaiters(err);
	}

	public wasNotTriggered(): void {
		this.rejectAwaiters(new Error(`Action didn't run`));
	}

	public static get runningAction(): CLIAction {
		if (!this._runningAction) {
			throw new Error(`No action has been called yet`);
		}
		return this._runningAction;
	}
}
