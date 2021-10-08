import { ParameterConfig } from './parameter';

export const booleanParameterName = 'booleanParameter';
export const arrayParameterName = 'arrayParameter';
export const singleValueParameterName = 'singleValueParameter';
export const defaultParameterName = 'defaultTypeParameter';
export const requiredParameterName = 'requiredTypeParameter';
export const booleanParameter: ParameterConfig = {
	name: booleanParameterName,
	aliases: ['-b', '--boolean-parameter'],
	description: 'A boolean flag',
	type: 'boolean'
};
export const arrayParameter: ParameterConfig = {
	name: arrayParameterName,
	aliases: ['-c', '--array-parameter'],
	description: 'A parameter with multiple values',
	type: 'array'
};
export const singleValueParameter: ParameterConfig = {
	name: singleValueParameterName,
	aliases: ['-u', '--single-value-parameter'],
	description: 'A parameter with a single string value',
	type: 'single-value'
};
export const defaultParameter: ParameterConfig = {
	name: defaultParameterName,
	aliases: ['-d', '--default-type-parameter'],
	description: 'The default type is also a single string value'
};
export const requiredParameter: ParameterConfig = {
	name: requiredParameterName,
	aliases: ['-p', '--required-type-parameter'],
	description: 'Required parameter',
	required: true
};
export const testCommandName = 'test-command';
export const baseArgv = ['ardrive', testCommandName];
