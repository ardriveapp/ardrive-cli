import { expect } from 'chai';
import { Parameter } from './parameter';

const parameterName = 'myCustomParam';
const parameterAliases = ['-c', '--my-custom-param'];
const parameterDescription = 'This is my custom parameter';

describe('Parameter class', () => {
	let parameter: Parameter;

	before(() => {
		Parameter.declare({
			name: parameterName,
			aliases: parameterAliases,
			description: parameterDescription
		});
	});

	it('A previously defined parameter can be read', () => {
		parameter = new Parameter(parameterName);
		expect(parameter).instanceOf(Parameter);
	});

	it('Throws an error if reading a undefined parameter', () => {
		expect(() => new Parameter('undefinedParameter')).to.throw();
	});

	it('The getters holds the right values', () => {
		parameter = new Parameter(parameterName);
		expect(parameter.name).to.equal(parameterName);
		expect(parameter.aliases).deep.equal(parameterAliases);
		expect(parameter.description).to.equal(parameterDescription);
		expect(parameter.default).to.be.undefined;
		expect(parameter.type).to.equal('single-value');
	});
});
