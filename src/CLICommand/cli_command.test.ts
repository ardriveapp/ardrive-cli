import { expect } from 'chai';
import { Command } from 'commander';
import { SinonStubbedInstance, stub } from 'sinon';
import { CLICommand, CommandDescriptor } from './cli_command';

// declare all parameters
import '../parameter_declarations';
import { DriveNameParameter } from '../parameter_declarations';
import { CliApiObject } from './cli';

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
// const driveAddressCommandName = 'drive-address-test';
// const driveAddressCommandDescription: CommandDescriptor = {
// 	name: driveAddressCommandName,
// 	parameters: [DriveAddressParameter],
// 	action(option) {
// 		/** This code here will run after argv is parsed */
// 		expect(option.driveNameTest).to.equal(MY_DRIVE_NAME);
// 	}
// };
// const driveAddressArgv: string[] = [
// 	...segmentOfActualArgvForThisEnv,
// 	driveAddressCommandName,
// 	'--drive-address',
// 	MY_DRIVE_NAME
// ];

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
		CLICommand.argv = driveNameArgv;
		stubbedProgram = new TestCliApiObject(program);
	});

	it('Calls the library API function once when a command is set', () => {
		new CLICommand(driveNameCommandDescription, stubbedProgram);
		expect(stubbedProgram.command.calledOnce).to.be.true;
		expect(stubbedProgram.action.calledOnce).to.be.true;
	});

	it('The library parses the given argv', () => {
		CLICommand.parse(stubbedProgram);
		expect(stubbedProgram.parse.calledOnce).to.be.true;
	});

	it("CLICommand won't allow to declare a command after parsed", () => {
		expect(() => new CLICommand(driveNameCommandDescription, stubbedProgram)).to.throw;
		expect(stubbedProgram.parse.notCalled);
	});
});
