import { expect } from 'chai';
import { Command } from 'commander';
import { SinonStubbedInstance, stub } from 'sinon';
import { assertConjunctionParameters, CLICommand, CommandDescriptor } from './cli_command';

import {
	DriveNameParameter,
	UnsafeDrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { CliApiObject } from './cli';
import { baseArgv } from './test_constants';
import { Parameter } from './parameter';
import { CLIAction } from './action';

const MY_DRIVE_NAME = 'My awesome drive!';
const testingCommandName = 'drive-name-test';
const driveNameCommandDescription: CommandDescriptor = {
	name: testingCommandName,
	parameters: [DriveNameParameter],
	action: new CLIAction(async (option) => {
		await expect(option.driveNameTest).to.equal(MY_DRIVE_NAME);
	})
};
const driveNameArgv: string[] = [...baseArgv, testingCommandName, '--drive-name', MY_DRIVE_NAME];
async function action() {
	// eslint-disable-next-line no-console
	console.log('DUMMY ACTION');
}
const nonEmptyValue = 'non-empty value';
const commandDescriptorRequiredWallet: CommandDescriptor = {
	name: testingCommandName,
	parameters: [
		WalletFileParameter,
		{ name: UnsafeDrivePasswordParameter, requiredConjunctionParameters: [WalletFileParameter] }
	],
	action: new CLIAction(action)
};
const parsedOptionsMissingWallet = {
	[WalletFileParameter]: undefined,
	[UnsafeDrivePasswordParameter]: nonEmptyValue
};
const commandDescriptorForbiddenWalletFileAndSeedPhrase: CommandDescriptor = {
	name: testingCommandName,
	parameters: [WalletFileParameter, SeedPhraseParameter],
	action: new CLIAction(action)
};
const parsedCommandOptionsBothSpecified = {
	[WalletFileParameter]: nonEmptyValue,
	[SeedPhraseParameter]: nonEmptyValue
};

class TestCliApiObject {
	constructor(private readonly program: CliApiObject = new Command() as CliApiObject) {}
	arguments = stub(this.program, 'arguments').returnsThis();
	action = stub(this.program, 'action').returnsThis();
	option = stub(this.program, 'option').returnsThis();
	requiredOption = stub(this.program, 'requiredOption').returnsThis();
	command = stub(this.program, 'command').returnsThis();
	parse = stub(this.program, 'parse');
	addHelpCommand = stub(this.program, 'addHelpCommand').returnsThis();
	opts = stub(this.program, 'opts').returnsThis();
	exitOverride = stub(this.program, 'exitOverride').returnsThis();
	name = stub(this.program, 'name').returnsThis();
	usage = stub(this.program, 'usage').returnsThis();
	outputHelp = stub(this.program, 'outputHelp');
}

describe('CLICommand class', () => {
	let stubbedProgram: SinonStubbedInstance<CliApiObject>;
	const program: CliApiObject = new Command() as CliApiObject;

	before(() => {
		stubbedProgram = new TestCliApiObject(program);
	});

	it('Calls the library API function once when a command is set', () => {
		new CLICommand(driveNameCommandDescription, stubbedProgram);
		expect(stubbedProgram.command.calledOnce).to.be.true;
		expect(stubbedProgram.action.calledOnce).to.be.true;
	});

	it('The library parses the given argv', () => {
		CLICommand.parse(stubbedProgram, driveNameArgv);
		expect(stubbedProgram.parse.calledOnce).to.be.true;
	});

	it('Assert required in conjunction parameters', () => {
		expect(function () {
			assertConjunctionParameters(commandDescriptorRequiredWallet, parsedOptionsMissingWallet);
		}).to.throw();
	});

	it('Assert forbidden in conjunction parameters', () => {
		expect(function () {
			assertConjunctionParameters(
				commandDescriptorForbiddenWalletFileAndSeedPhrase,
				parsedCommandOptionsBothSpecified
			);
		}).to.throw();
	});

	it('No colliding parameters', () => {
		const allCommandDescriptors = CLICommand._getAllCommandDescriptors();
		allCommandDescriptors.forEach((command) => {
			const parameters = command.parameters.map((param) => new Parameter(param));
			parameters.forEach((parameter_1, index) => {
				const allParametersExceptMe = parameters;
				allParametersExceptMe.splice(index);
				const collidingParameters = allParametersExceptMe.filter((parameter_2) => {
					const areAllowedInConjunction = !parameter_2.forbiddenParametersInConjunction.includes(
						parameter_1.name
					);
					if (areAllowedInConjunction) {
						return parameter_2.aliases.find((alias) => parameter_1.aliases.includes(alias));
					}
					return false;
				});
				// if (collidingParameters.length) {
				// 	debugger;
				// }
				expect(collidingParameters).to.be.empty;
			});
		});
	});
});
