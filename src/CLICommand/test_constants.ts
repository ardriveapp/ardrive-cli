import { ParameterData } from './parameter';

export const booleanParameterName = 'booleanParameter';
export const arrayParameterName = 'arrayParameter';
export const singleValueParameterName = 'singleValueParameter';
export const defaultParameterName = 'defaultTypeParameter';
export const requiredParameterName = 'requiredTypeParameter';
export const booleanParameter: ParameterData = {
	name: booleanParameterName,
	aliases: ['-b', '--boolean-parameter'],
	description: 'A boolean flag',
	type: 'boolean'
};
export const arrayParameter: ParameterData = {
	name: arrayParameterName,
	aliases: ['-c', '--array-parameter'],
	description: 'A parameter with multiple values',
	type: 'array'
};
export const singleValueParameter: ParameterData = {
	name: singleValueParameterName,
	aliases: ['-u', '--single-value-parameter'],
	description: 'A parameter with a single string value',
	type: 'single-value'
};
export const defaultParameter: ParameterData = {
	name: defaultParameterName,
	aliases: ['-d', '--default-type-parameter'],
	description: 'The default type is also a single string value'
};
export const requiredParameter: ParameterData = {
	name: requiredParameterName,
	aliases: ['-p', '--required-type-parameter'],
	description: 'Required parameter',
	required: true
};
