import { ActionReturnType, AsyncActionCallback, ParsedParameters } from './cli';
import { ERROR_EXIT_CODE } from './error_codes';

/**
 * A wrapper for the command action callback
 */
export class CLIAction {
	private _promiseInstance?: Promise<ActionReturnType>;
	private _parsedParameters: ParsedParameters = {};
	private awaiterDone?: (value?: ParsedParameters, error?: Error) => void;
	private static _runningAction?: CLIAction;

	/**
	 * Create an instance of CLIAction
	 * @param {AsyncActionCallback} actionCallback the handler method of the action
	 */
	constructor(private readonly actionCallback: AsyncActionCallback) {}

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

	/**
	 * A static member refering to the executed action
	 * @name runningAction
	 * @type {CLIAction}
	 * @throws - When read before any action has run
	 */
	public static get runningAction(): CLIAction {
		if (!this._runningAction) {
			throw new Error(`No action has been called yet`);
		}
		return this._runningAction;
	}

	/**
	 * Triggers the callback of the action and returns its promise
	 * @name trigger
	 * @param {ParsedParameters} params - A key/value dict representing the parsed argv
	 * @returns {Promise<ActionReturnType>} - The promise of the callback
	 */
	async trigger(params: ParsedParameters): Promise<ActionReturnType> {
		this._promiseInstance = this.actionCallback(params);
		CLIAction._runningAction = this;
		this._parsedParameters = params;
		return this.promiseInstance
			.then((exitCode) => {
				this.resolveAwaiter();
				return exitCode;
			})
			.catch((err: Error) => {
				this.rejectAwaiter(err);
				return ERROR_EXIT_CODE;
			});
	}

	/**
	 * A hook promise to the action callback
	 * @returns {Promise<ParsedParameters} - Resolves into the parsed parameters; rejects if the callback throws, or if another action has run
	 */
	actionAwaiter(): Promise<ParsedParameters> {
		if (this._promiseInstance) {
			// the promise was already called, resolve when the action is finished
			return this.promiseInstance.then(() => this.parsedParameters);
		} else {
			// queque the awaiter for when the promise is called
			const awaiter = new Promise<ParsedParameters>((resolve, reject) => {
				this.awaiterDone = function (value?: ParsedParameters, error?: Error): void {
					if (value) {
						resolve(value);
					} else {
						reject(error);
					}
				};
			});
			return awaiter;
		}
	}

	private resolveAwaiter(): void {
		if (this.awaiterDone) {
			const awaiter = this.awaiterDone;
			awaiter(this.parsedParameters);
		}
	}

	private rejectAwaiter(err: Error): void {
		if (this.awaiterDone) {
			const awaiter = this.awaiterDone;
			awaiter(undefined, err);
		}
	}

	/**
	 * Rejects all the awaiters of this specific action with the given err
	 * @param {Error} err - The error thrown while parsing the argv
	 * @returns {void}
	 */
	public setParsingError(err: Error): void {
		this.rejectAwaiter(err);
	}

	/**
	 * Rejects all the awaiters of this specific action because another action has run
	 * @returns {void}
	 */
	public wasNotTriggered(): void {
		this.rejectAwaiter(new Error(`Action didn't run`));
	}
}
