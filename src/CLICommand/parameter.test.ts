import { expect } from 'chai';
import { Parameter, ParameterConfig, ParameterOverridenConfig } from './parameter';
import { defaultParameter, defaultParameterName } from './test_constants';

const parameterName = 'myCustomParam';
const parameterAliases = ['-c', '--my-custom-param'];
const parameterDescription = 'This is my custom parameter';
const overridenParameterDescription = 'OVERRIDEN!';
const initialParameterConfig: ParameterConfig = {
	name: parameterName,
	aliases: parameterAliases,
	description: parameterDescription
};
const overridenParameterConfig: ParameterOverridenConfig = {
	name: parameterName,
	description: overridenParameterDescription
};

describe('Parameter class', () => {
	let parameter: Parameter;

	before(() => {
		Parameter.declare(initialParameterConfig);
	});

	it('A previously defined parameter can be read', () => {
		parameter = new Parameter(parameterName);
		expect(parameter).instanceOf(Parameter);
	});

	it('Throws an error if reading a undefined parameter', () => {
		expect(() => new Parameter('undefinedParameter')).to.throw();
	});

	it('Default type parameter is "single-value"', () => {
		Parameter.declare(defaultParameter);
		const defaultParam = new Parameter(defaultParameterName);
		expect(defaultParam.type).to.equal('single-value');
	});

	it('The getters holds the right values', () => {
		parameter = new Parameter(parameterName);
		expect(parameter.name).to.equal(parameterName);
		expect(parameter.aliases).deep.equal(parameterAliases);
		expect(parameter.description).to.equal(parameterDescription);
		expect(parameter.default).to.be.undefined;
		expect(parameter.type).to.equal('single-value');
	});

	it('Passing an object as argument would ovewrite the default configuration', () => {
		parameter = new Parameter(overridenParameterConfig);
		expect(parameter.description).to.equal(overridenParameterDescription);
	});
});
