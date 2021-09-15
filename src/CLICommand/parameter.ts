export type ParameterName = string;
export type ParameterType = 'single-value' | 'boolean' | 'array';

export interface ParameterData {
	name: ParameterName;
	aliases: ParameterName[];
	description: string;
	type?: ParameterType;
	default?: string;
	required?: boolean;
	forbiddenConjunctionParameters?: ParameterName[];
	requireedConjunctionParameters?: ParameterName[];
}

export class Parameter implements ParameterData {
	private parameterData: ParameterData;
	private static parameters: ParameterData[] = [];

	constructor(public readonly name: ParameterName) {
		this.parameterData = Parameter.get(name);
	}

	public get aliases(): ParameterName[] {
		return this.parameterData.aliases;
	}

	public get description(): string {
		return this.parameterData.description;
	}

	public get default(): string | undefined {
		return this.parameterData.default;
	}

	public get type(): ParameterType {
		return this.parameterData.type || 'single-value';
	}

	public get required(): boolean {
		return !!this.parameterData.required;
	}

	public static declare(parameter: ParameterData): void {
		Parameter.parameters.push(parameter);
	}

	public static get(parameterName: ParameterName): ParameterData {
		const param = Parameter.parameters.find((p) => p.name === parameterName);
		if (!param) {
			throw new Error(`No such parameter ${parameterName}`);
		}
		return param;
	}
}
