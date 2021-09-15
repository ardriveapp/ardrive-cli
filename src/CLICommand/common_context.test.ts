import { expect } from 'chai';
import { Command } from 'commander';
import { CliApiObject, ParsedArguments } from './cli';
import { CLICommand, CommandDescriptor } from './cli_command';
import { CommonContext } from './common_context';
import { Parameter, ParameterName } from './parameter';
import {
	arrayParameter,
	arrayParameterName,
	booleanParameter,
	booleanParameterName,
	requiredParameter,
	singleValueParameter,
	singleValueParameterName
} from './test_constants';

const segmentOfActualArgvForThisEnv = process.argv.slice(0, 2);

const testCommandName = 'test-command';

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
			const context = new CommonContext(options);
			expect(context.getParameterValue(singleValueParameterName)).to.not.be.undefined;
		});
		program.parse([...segmentOfActualArgvForThisEnv, testCommandName, '--single-value-parameter', '1234567890']);
	});

	it('Boolean parameter false', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], (options) => {
			const context = new CommonContext(options);
			expect(!!context.getParameterValue(booleanParameterName)).to.be.false;
		});
		program.parse([...segmentOfActualArgvForThisEnv, testCommandName]);
	});

	it('Boolean parameter true', () => {
		Parameter.declare(booleanParameter);
		declareCommandWithParams(program, [booleanParameterName], (options) => {
			const context = new CommonContext(options);
			expect(context.getParameterValue(booleanParameterName)).to.be.true;
		});
		program.parse([...segmentOfActualArgvForThisEnv, testCommandName, '--boolean-parameter']);
	});

	it('Array parameter', () => {
		const colorsArray = ['red', 'green', 'blue'];
		Parameter.declare(arrayParameter);
		declareCommandWithParams(program, [arrayParameterName], (options) => {
			const context = new CommonContext(options);
			expect(context.getParameterValue(arrayParameterName)).to.deep.equal(colorsArray);
		});
		program.parse([...segmentOfActualArgvForThisEnv, testCommandName, '--array-parameter', ...colorsArray]);
	});

	it('Required parameter throws if missing', () => {
		program.parse([...segmentOfActualArgvForThisEnv]);
		Parameter.declare(requiredParameter);
	});
});
