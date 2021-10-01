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
	requiredConjunctionParameters?: ParameterName[];
}

export class Parameter implements ParameterData {
	private parameterData: ParameterData;
	private static parameters: ParameterData[] = [];

	constructor(public readonly name: ParameterName, config?: Partial<ParameterData> & Omit<ParameterData, 'name'>) {
		this.parameterData = Object.assign(Parameter.get(name), config);
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

	public get forbiddenParametersInConjunction(): ParameterName[] {
		return Array.isArray(this.parameterData.forbiddenConjunctionParameters)
			? this.parameterData.forbiddenConjunctionParameters.slice()
			: [];
	}

	public get requiredParametersInConjunction(): ParameterName[] {
		return Array.isArray(this.parameterData.requiredConjunctionParameters)
			? this.parameterData.requiredConjunctionParameters.slice()
			: [];
	}

	public static declare(parameter: ParameterData): void {
		Parameter.parameters.push(parameter);
	}

	/**
	 * @name reset
	 * For testing purposes only. It will just remove all parameters declaration
	 * @returns {ParameterData[]} the removed parameters
	 */
	public static reset(): ParameterData[] {
		return this.parameters.splice(0, this.parameters.length);
	}

	public static get(parameterName: ParameterName): ParameterData {
		const param = Parameter.parameters.find((p) => p.name === parameterName);
		if (!param) {
			throw new Error(`No such parameter ${parameterName}`);
		}
		return Object.assign({}, param);
	}
}
