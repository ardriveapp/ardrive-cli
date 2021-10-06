export type ParameterName = string;
export type ParameterType = 'single-value' | 'boolean' | 'array';
export type ParameterOverridenConfig = Partial<ParameterConfig> & Pick<ParameterConfig, 'name'>;
export type ParameterOverridingConfigWithoutName = Partial<ParameterConfig> & Omit<ParameterConfig, 'name'>;

export interface ParameterConfig {
	name: ParameterName;
	aliases: ParameterName[];
	description: string;
	type?: ParameterType;
	default?: string;
	required?: boolean;
	forbiddenConjunctionParameters?: ParameterName[];
	requiredConjunctionParameters?: ParameterName[];
}

export class Parameter implements ParameterConfig {
	public readonly name;
	private parameterData: ParameterConfig;
	private static parameters: ParameterConfig[] = [];

	constructor(arg: ParameterName | ParameterOverridenConfig) {
		const argAsParameterName = arg as ParameterName;
		const argAsOverridenConfig = arg as ParameterOverridenConfig;
		const overridenConfig = (function () {
			if (typeof arg === 'string') {
				return undefined;
			} else {
				return argAsOverridenConfig;
			}
		})();
		this.name = overridenConfig?.name || argAsParameterName;
		this.parameterData = Object.assign(Parameter.get(this.name), overridenConfig);
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

	public static declare(parameter: ParameterConfig): void {
		Parameter.parameters.push(parameter);
	}

	/**
	 * @name reset
	 * For testing purposes only. It will just remove all parameters declaration
	 * @returns {ParameterConfig[]} the removed parameters
	 */
	public static reset(): ParameterConfig[] {
		return this.parameters.splice(0, this.parameters.length);
	}

	public static get(parameterName: ParameterName): ParameterConfig {
		const param = Parameter.parameters.find((p) => p.name === parameterName);
		if (!param) {
			throw new Error(`No such parameter ${parameterName}`);
		}
		return Object.assign({}, param);
	}
}
