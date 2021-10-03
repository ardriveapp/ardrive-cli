import { expect } from 'chai';
import { Command } from 'commander';
import { CliApiObject, ParsedArguments } from './cli';
import { CLICommand, CommandDescriptor } from './cli_command';
import { Parameter, ParameterName } from './parameter';
import {
	arrayParameter,
	arrayParameterName,
	baseArgv,
	booleanParameter,
	booleanParameterName,
	requiredParameter,
	requiredParameterName,
	singleValueParameter,
	singleValueParameterName,
	testCommandName
} from './test_constants';
import { ParametersHelper } from './parameters_helper';

function declareCommandWithParams(
	program: CliApiObject,
	parameters: ParameterName[],
	action: (options: ParsedArguments) => Promise<void>
): void {
	const command: CommandDescriptor = {
		name: testCommandName,
		parameters,
		action
	};
	new CLICommand(command, program);
}

describe('ParametersHelper class', () => {
	let program: CliApiObject;

	beforeEach(() => {
		program = new Command() as CliApiObject;
		Parameter.reset();
	});

	it('Actually reads the value from argv', () => {
		Parameter.declare(singleValueParameter);
		declareCommandWithParams(program, [singleValueParameterName], async (options) => {
			const parameters = new ParametersHelper(options);
			expect(parameters.getParameterValue(singleValueParameterName)).to.not.be.undefined;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
	});

	it('Boolean parameter false', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], async (options) => {
			const parameters = new ParametersHelper(options);
			expect(!!parameters.getParameterValue(booleanParameterName)).to.be.false;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName]);
	});

	it('Boolean parameter true', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], async (options) => {
			const parameters = new ParametersHelper(options);
			expect(parameters.getParameterValue(booleanParameterName)).to.be.true;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--boolean-parameter']);
	});

	it('Array parameter', () => {
		const colorsArray = ['red', 'green', 'blue'];
		Parameter.declare(arrayParameter);
		declareCommandWithParams(program, [arrayParameterName], async (options) => {
			const parameters = new ParametersHelper(options);
			expect(parameters.getParameterValue(arrayParameterName)).to.deep.equal(colorsArray);
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--array-parameter', ...colorsArray]);
	});

	it('Required parameter throws if missing', () => {
		CLICommand.parse(program, [...baseArgv, requiredParameterName]);
		Parameter.declare(requiredParameter);
	});
});
