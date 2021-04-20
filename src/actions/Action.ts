const READY_STATE = 'ready';
const FIRED_STATE = 'fired';
const FAILED_STATE = 'failed';

type StateType = 'ready' | 'fired' | 'failed';

export class Result<T> {
	private value: T;
	private key: string;

	constructor(key: string, v: T) {
		this.value = v;
		this.key = key;
	}

	getMyType(): string {
		return typeof this.value;
	}

	getName(): string {
		return this.key;
	}

	getValue(): T {
		return this.value;
	}
}

export interface Fireable<T> {
	name: string;
	state: StateType;
	_scriptHandler?(context: ActionContext): T | Promise<T>;
	fire(context: ActionContext): Promise<any>;
	result?: T;
	failOnError: boolean;
}

export abstract class ScriptItem<T> implements Fireable<T> {
	abstract name: string;
	abstract _scriptHandler(context: Object): Promise<T>;
	public state: StateType;
	public result?: T;
	public failOnError: boolean = false;

	constructor() {
		this.state = READY_STATE;
	}

	public async fire(context: ActionContext) {
		const result = await this._scriptHandler(context).catch((e) => {
			this.state = FAILED_STATE;
			throw e;
		});
		this.result = result;
		this.state = FIRED_STATE;
		return result;
	}

	getValue(): T | null {
		return this.result || null;
	}
}

export class ActionContext {
	private values: Result<any>[] = [];

	constructor(values: Result<any>[]) {
		this.values = values;
	}

	get<T>(key: string): T | null {
		const values = this.values;
		const finder = (v: Result<any>) => v.getName() === key;
		const value: Result<T> | undefined = values.find(finder);
		return value ? value.getValue() : null;
	}
}

export abstract class Action implements Fireable<Object> {
	abstract name: string;
	abstract tag: string;
	abstract script: Fireable<Object>[] = [];
	public userAccesible = false;
	public failOnError: boolean = false;
	state: StateType = READY_STATE;
	private _dummyParse(a: Result<any>[]) {
		console.warn(`Action ${this.name} has no parser, returning the raw unparsed value...`);
		return a;
	}
	protected _parseResponse?(results: Result<any>[]): any;

	get results(): Result<any>[] {
		const result: Result<any>[] = [];
		for (let script of this.script as Fireable<any>[]) {
			if (script.state === FIRED_STATE) {
				if (Array.isArray(script.result)) {
					result.push(...script.result);
				}
				result.push(new Result(script.name, script.result));
			}
		}
		return result;
	}

	get result() {
		return (this._parseResponse && this._parseResponse(this.results)) || this._dummyParse(this.results);
	}

	public fire = async (context?: ActionContext) => {
		for (let script of this.script) {
			await script.fire(context || new ActionContext(this.results)).catch((e: Error) => {
				console.error(`Script ${script.name} just failed: ${e}`);
				if (script.failOnError) {
					this.state = FAILED_STATE;
					throw e;
				}
			});
		}
		debugger;
		this.state = FIRED_STATE;
	};

	private static registeredActions: Action[] = [];

	static registerAction(action: Action) {
		Action.registeredActions.push(action);
	}

	static resolve = async (tag: string, name: string = ''): Promise<Action> => {
		for (let action of Action.registeredActions) {
			if (action.tag === tag && action.name === name) {
				if (action.userAccesible) {
					return action;
				}
				throw new Error('Action is not user-accesible');
			}
		}
		throw new Error('No such action');
	};
}
