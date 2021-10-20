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
import {
	AddressParameter,
	DriveKeyParameter,
	UnsafeDrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import '../parameter_declarations';
import { urlEncodeHashKey } from '../utils';

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
		it('returns false when none of --unsafe-drive-password, --drive-key, -p, or -k are provided', () => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.false;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});

		it('returns true when --unsafe-drive-password is provided', () => {
			declareCommandWithParams(program, [UnsafeDrivePasswordParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getIsPrivate()).to.be.true;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--unsafe-drive-password', 'pw']);
		});

		it('returns true when -p is provided', () => {
			declareCommandWithParams(program, [UnsafeDrivePasswordParameter], async (options) => {
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

	describe('getRequiredWallet method', () => {
		it('returns a wallet when a valid --wallet-file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getRequiredWallet()).to.not.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
		});

		it('returns a wallet when a valid --w file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getRequiredWallet()).to.not.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
		});

		it('returns a wallet when a valid --seed-phrase option is provided', () => {
			declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getRequiredWallet()).to.not.be.null;
			});
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--seed-phrase',
				'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
			]);
		});

		// Note: Redundant prolonged seed-phrase tests are commented out to save testing time

		// it('returns a wallet when a valid -s option is provided', () => {
		// 	declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 		const parameters = new ParametersHelper(options);
		// 		expect(await parameters.getRequiredWallet()).to.not.be.null;
		// 	});
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'-s',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		it('throws when none of --wallet-file, -w, --seed-phrase, or -s option are provided', (done) => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				await parameters
					.getRequiredWallet()
					.then((wallet) => {
						done(`It shouldn't have returned a wallet: ${wallet}`);
					})
					.catch(() => {
						done();
					});
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});
	});

	describe('getOptionalWallet method', () => {
		it('returns a wallet when a valid --wallet-file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getOptionalWallet()).to.not.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
		});

		it('returns a wallet when a valid --w file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(await parameters.getOptionalWallet()).to.not.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
		});

		// Note: Redundant prolonged seed-phrase tests are commented out to save testing time

		// it('returns a wallet when a valid --seed-phrase option is provided', () => {
		// 	declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 		const parameters = new ParametersHelper(options);
		// 		expect(await parameters.getOptionalWallet()).to.not.be.null;
		// 	});
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'--seed-phrase',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		// it('returns a wallet when a valid -s option is provided', () => {
		// 	declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 		const parameters = new ParametersHelper(options);
		// 		expect(await parameters.getOptionalWallet()).to.not.be.null;
		// 	});
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'-s',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		it('returns null when none of --wallet-file, -w, --seed-phrase, or -s option are provided', () => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				const wallet = await parameters.getOptionalWallet().catch(() => null);
				expect(wallet).to.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});
	});

	describe('getWalletAddress method', () => {
		it('returns the address of the wallet when a valid --wallet-file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect((await parameters.getWalletAddress()).valueOf()).to.equal(
					'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
				);
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
		});

		it('returns the address of the wallet when a valid --w file is provided', () => {
			declareCommandWithParams(program, [WalletFileParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect((await parameters.getWalletAddress()).valueOf()).to.equal(
					'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
				);
			});
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
		});

		// Note: Redundant prolonged seed-phrase tests are commented out to save testing time

		// it('returns the address of the wallet when a valid --seed-phrase option is provided', () => {
		// 	declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 		const parameters = new ParametersHelper(options);
		// expect(await (await parameters.getWalletAddress()).valueOf()).to.equal('P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4');
		// 	});
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'--seed-phrase',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		// it('returns the address of the wallet when a valid -s option is provided', () => {
		// 	declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 		const parameters = new ParametersHelper(options);
		// expect(await (await parameters.getWalletAddress()).valueOf()).to.equal('P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4');
		// 	});
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'-s',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		it('returns the address provided by the --address option value', () => {
			declareCommandWithParams(program, [AddressParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect((await parameters.getWalletAddress()).valueOf()).to.equal(
					'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
				);
			});
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--address',
				'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
			]);
		});

		it('returns the address provided by the -a option value', () => {
			declareCommandWithParams(program, [AddressParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect((await parameters.getWalletAddress()).valueOf()).to.equal(
					'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
				);
			});
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'-a',
				'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
			]);
		});

		it('throws when none of --wallet-file, -w, --seed-phrase, -s, --address, or -a option are provided', () => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				const wallet = await parameters.getWalletAddress().catch(() => null);
				expect(wallet).to.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});
	});

	describe('getDriveKey method', () => {
		it('returns the correct drive key given a valid --wallet-file and --unsafe-drive-password', () => {
			declareCommandWithParams(program, [WalletFileParameter, UnsafeDrivePasswordParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(
					urlEncodeHashKey(await parameters.getDriveKey({ driveId: '00000000-0000-0000-0000-000000000000' }))
				).to.equal('Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg');
			});
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--wallet-file',
				'./test_wallet.json',
				'--unsafe-drive-password',
				'password'
			]);
		});

		it('returns the drive key provided by the --drive-key option', () => {
			declareCommandWithParams(program, [DriveKeyParameter], async (options) => {
				const parameters = new ParametersHelper(options);
				expect(
					urlEncodeHashKey(await parameters.getDriveKey({ driveId: '00000000-0000-0000-0000-000000000000' }))
				).to.equal('Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg');
			});
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--drive-key',
				'Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg'
			]);
		});

		it('throws when none of --wallet-file, -w, --seed-phrase, -s, --drive-key, or -k option are provided', () => {
			declareCommandWithParams(program, [], async (options) => {
				const parameters = new ParametersHelper(options);
				const driveKey = await parameters
					.getDriveKey({ driveId: '00000000-0000-0000-0000-000000000000' })
					.catch(() => null);
				expect(driveKey).to.be.null;
			});
			CLICommand.parse(program, [...baseArgv, testCommandName]);
		});
	});

	describe('getMaxDepth method', () => {
		it(`Defaults to zero`);
		it(`Does not accept a decimal`);
		it(`Does not accept a negative integer`);
		it(`Max depth is infinity when --all is specified`);
		it(`Custom positive value is providen`);
	});
});
