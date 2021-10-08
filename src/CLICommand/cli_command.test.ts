import { expect } from 'chai';
import { Command } from 'commander';
import { SinonStubbedInstance, stub } from 'sinon';
import { assertConjunctionParameters, CLICommand, CommandDescriptor } from './cli_command';

import {
	DriveNameParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { CliApiObject } from './cli';
import { baseArgv } from './test_constants';

const MY_DRIVE_NAME = 'My awesome drive!';
const testingCommandName = 'drive-name-test';
const driveNameCommandDescription: CommandDescriptor = {
	name: testingCommandName,
	parameters: [DriveNameParameter],
	async action(option) {
		/** This code here will run after argv is parsed */
		expect(option.driveNameTest).to.equal(MY_DRIVE_NAME);
	}
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
		{ name: DrivePasswordParameter, requiredConjunctionParameters: [WalletFileParameter] }
	],
	action
};
const parsedOptionsMissingWallet = {
	[WalletFileParameter]: undefined,
	[DrivePasswordParameter]: nonEmptyValue
};
const commandDescriptorForbiddenWalletFileAndSeedPhrase: CommandDescriptor = {
	name: testingCommandName,
	parameters: [WalletFileParameter, SeedPhraseParameter],
	action
};
const parsedCommandOptionsBothSpecified = {
	[WalletFileParameter]: nonEmptyValue,
	[SeedPhraseParameter]: nonEmptyValue
};

process.exit = (n: number) => {
	process.exit(n);
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
});
