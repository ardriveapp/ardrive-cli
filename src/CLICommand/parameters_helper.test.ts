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
import { DriveKeyParameter, DrivePasswordParameter } from '../parameter_declarations';
import '../parameter_declarations';

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

	describe('getIsPrivate method', () => {
		it('returns false when none of --drive-password, --drive-key, -p, or -k are provided', () => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.false;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});

		it('returns true when --drive-password is provided', () => {
			declareCommandWithParams(program, [DrivePasswordParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.true;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--drive-password', 'pw']);
		});

		it('returns true when -p is provided', () => {
			declareCommandWithParams(program, [DrivePasswordParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.true;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '-p', 'pw']);
		});

		it('returns true when --drive-key is provided', () => {
			declareCommandWithParams(program, [DriveKeyParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.true;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--drive-key', 'key']);
		});

		it('returns true when -k is provided', () => {
			declareCommandWithParams(program, [DriveKeyParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.true;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '-k', 'key']);
		});
	});
});
