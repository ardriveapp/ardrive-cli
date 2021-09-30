import { expect } from 'chai';
import { Command } from 'commander';
import { CliApiObject, ParsedArguments } from './cli';
import { CLICommand, CommandDescriptor } from './cli_command';
import { CommonContext } from './common_context';
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
import { cliWalletDao } from '..';

function declareCommandWithParams(
	program: CliApiObject,
	parameters: ParameterName[],
	action: (options: ParsedArguments) => void
): void {
	const command: CommandDescriptor = {
		name: testCommandName,
		parameters,
		action
	};
	new CLICommand(command, program);
}

describe('CommonContext class', () => {
	let program: CliApiObject;

	beforeEach(() => {
		program = new Command() as CliApiObject;
		Parameter.reset();
	});

	it('Actually reads the value from argv', () => {
		Parameter.declare(singleValueParameter);
		declareCommandWithParams(program, [singleValueParameterName], (options) => {
			const context = new CommonContext(options, cliWalletDao);
			expect(context.getParameterValue(singleValueParameterName)).to.not.be.undefined;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
	});

	it('Boolean parameter false', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], (options) => {
			const context = new CommonContext(options, cliWalletDao);
			expect(!!context.getParameterValue(booleanParameterName)).to.be.false;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName]);
	});

	it('Boolean parameter true', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], (options) => {
			const context = new CommonContext(options, cliWalletDao);
			expect(context.getParameterValue(booleanParameterName)).to.be.true;
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--boolean-parameter']);
	});

	it('Array parameter', () => {
		const colorsArray = ['red', 'green', 'blue'];
		Parameter.declare(arrayParameter);
		declareCommandWithParams(program, [arrayParameterName], (options) => {
			const context = new CommonContext(options, cliWalletDao);
			expect(context.getParameterValue(arrayParameterName)).to.deep.equal(colorsArray);
		});
		CLICommand.parse(program, [...baseArgv, testCommandName, '--array-parameter', ...colorsArray]);
	});

	it('Required parameter throws if missing', () => {
		CLICommand.parse(program, [...baseArgv, requiredParameterName]);
		Parameter.declare(requiredParameter);
	});
});
