import { expect } from 'chai';
import { Command } from 'commander';
import { createStubInstance, SinonStubbedInstance, stub } from 'sinon';
import { CLICommand, CommandDescriptor } from './cliCommand';

// declare all parameters
import '../parameter_declarations';
import { DriveAddressParameter, DriveNameParameter } from '../parameter_declarations';

const segmentOfActualArgvForThisEnv = process.argv.slice(0, 2);

const MY_DRIVE_NAME = 'My awesome drive!';
const driveNameCommandName = 'drive-name-test';
const driveNameCommandDescription: CommandDescriptor = {
	name: driveNameCommandName,
	parameters: [DriveNameParameter],
	action(option) {
		/** This code here will run after argv is parsed */
		expect(option.driveNameTest).to.equal(MY_DRIVE_NAME);
	}
};
const driveNameArgv: string[] = [...segmentOfActualArgvForThisEnv, driveNameCommandName, '--drive-name', MY_DRIVE_NAME];

// const MY_DRIVE_ADDRESS = '00000000000000000000000000000000';
const driveAddressCommandName = 'drive-address-test';
const driveAddressCommandDescription: CommandDescriptor = {
	name: driveAddressCommandName,
	parameters: [DriveAddressParameter],
	action(option) {
		/** This code here will run after argv is parsed */
		expect(option.driveNameTest).to.equal(MY_DRIVE_NAME);
	}
};
// const driveAddressArgv: string[] = [
// 	...segmentOfActualArgvForThisEnv,
// 	driveAddressCommandName,
// 	'--drive-address',
// 	MY_DRIVE_NAME
// ];

process.exit = (n: number) => {
	process.exit(n);
};

describe('CLICommand class', () => {
	let stubbedProgram: SinonStubbedInstance<Command>;
	let program: Command;

	before(() => {
		CLICommand.argv = driveNameArgv;
	});

	beforeEach(() => {
		// program = new Command();
		stubbedProgram = createStubInstance(Command);
		stubbedProgram.option.callsFake(stub().returnsThis());
		stubbedProgram.command.callsFake(stub().returnsThis());
		const stubbedProgramAsUnknown: unknown = stubbedProgram;
		program = stubbedProgramAsUnknown as Command;
	});

	it('Calls the library API function once when a command is set', () => {
		new CLICommand(driveNameCommandDescription, program);
		expect(stubbedProgram.command.calledOnce).to.be.true;
	});

	it('Calls the library API function twice after two commands set', () => {
		new CLICommand(driveNameCommandDescription, program);
		new CLICommand(driveAddressCommandDescription, program);
		expect(stubbedProgram.command.calledTwice).to.be.true;
	});

	it('The library parses the given argv', () => {
		new CLICommand(driveNameCommandDescription, program);

		CLICommand.parse(program);

		expect(stubbedProgram.parse.calledOnce).to.be.true;
	});

	it("CLICommmand won't allow to declare a command after parsed", () => {
		expect(() => new CLICommand(driveNameCommandDescription, program)).to.throw;
		expect(stubbedProgram.parse.notCalled);
	});
});
