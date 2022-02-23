import { expect } from 'chai';
import { Command } from 'commander';
import { ActionReturnType, CliApiObject, ParsedParameters } from './cli';
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
	WalletFileParameter,
	MaxDepthParameter,
	AllParameter,
	DryRunParameter
} from '../parameter_declarations';
import '../parameter_declarations';
import { CLIAction } from './action';
import { SUCCESS_EXIT_CODE } from './error_codes';
import { ArweaveAddress, EID, urlEncodeHashKey } from 'ardrive-core-js';

const expectedArweaveAddress = new ArweaveAddress('P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4');

const dummyActionHandler = () => Promise.resolve(SUCCESS_EXIT_CODE);

/**
 * @name declareCommandWithParams
 * @param program
 * @param parameters
 * @param action  - default is set for testing propuses
 * @returns {void}
 */
function declareCommandWithParams(
	program: CliApiObject,
	parameters: ParameterName[],
	action?: (options: ParsedParameters) => Promise<ActionReturnType>
): CLICommand {
	const command: CommandDescriptor = {
		name: testCommandName,
		parameters,
		action: new CLIAction(action || dummyActionHandler)
	};
	return new CLICommand(command, program);
}

describe('ParametersHelper class', () => {
	let program: CliApiObject;

	beforeEach(() => {
		program = new Command() as CliApiObject;
	});

	describe('getParameterValue function', () => {
		it('Actually reads the value from argv', () => {
			Parameter.declare(singleValueParameter);
			const cmd = declareCommandWithParams(program, [singleValueParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getParameterValue(singleValueParameterName)).to.not.be.undefined;
			});
		});

		it('Boolean parameter false', () => {
			Parameter.declare(booleanParameter);
			const cmd = declareCommandWithParams(program, [booleanParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(!!parameters.getParameterValue(booleanParameterName)).to.be.false;
			});
		});

		it('Boolean parameter true', () => {
			Parameter.declare(booleanParameter);
			const cmd = declareCommandWithParams(program, [booleanParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--boolean-parameter']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getParameterValue(booleanParameterName)).to.be.true;
			});
		});

		it('Array parameter', () => {
			const colorsArray = ['red', 'green', 'blue'];
			Parameter.declare(arrayParameter);
			const cmd = declareCommandWithParams(program, [arrayParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--array-parameter', ...colorsArray]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getParameterValue<string[]>(arrayParameterName)).to.deep.equal(colorsArray);
			});
		});

		it('Calls the provided value mapping function', () => {
			Parameter.declare(singleValueParameter);
			const cmd = declareCommandWithParams(program, [singleValueParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getParameterValue(singleValueParameterName, Number)).to.equal(1234567890);
			});
		});
	});

	describe('getRequiredParameterValue function', () => {
		it('Actually reads the value from argv', () => {
			Parameter.declare(singleValueParameter);
			const cmd = declareCommandWithParams(program, [singleValueParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getRequiredParameterValue(singleValueParameterName)).to.not.be.undefined;
			});
		});

		it('Boolean parameter true', () => {
			Parameter.declare(booleanParameter);
			const cmd = declareCommandWithParams(program, [booleanParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--boolean-parameter']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getRequiredParameterValue(booleanParameterName)).to.be.true;
			});
		});

		it('Array parameter', () => {
			const colorsArray = ['red', 'green', 'blue'];
			Parameter.declare(arrayParameter);
			const cmd = declareCommandWithParams(program, [arrayParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--array-parameter', ...colorsArray]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getRequiredParameterValue<string[]>(arrayParameterName)).to.deep.equal(
					colorsArray
				);
			});
		});

		it('Calls the provided value mapping function', () => {
			Parameter.declare(singleValueParameter);
			const cmd = declareCommandWithParams(program, [singleValueParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--single-value-parameter', '1234567890']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(parameters.getRequiredParameterValue(singleValueParameterName, Number)).to.equal(
					1234567890
				);
			});
		});

		it('throws an exception when option is missing', () => {
			Parameter.declare(booleanParameter);
			const cmd = declareCommandWithParams(program, [booleanParameterName]);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return expect(() => parameters.getRequiredParameterValue(booleanParameterName)).to.throw;
			});
		});
	});

	it('Required parameter throws if missing', () => {
		Parameter.declare(requiredParameter);
		declareCommandWithParams(program, [requiredParameterName]);
		expect(() => CLICommand.parse(program, [...baseArgv, testCommandName])).to.throw();
	});

	describe('getIsPrivate method', () => {
		it('returns false when none of --unsafe-drive-password, --drive-key, -p, or -k are provided', () => {
			const cmd = declareCommandWithParams(program, []);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getIsPrivate().then((isPrivate) => expect(isPrivate).to.be.false);
			});
		});

		it('returns true when --unsafe-drive-password is provided', () => {
			const cmd = declareCommandWithParams(program, [UnsafeDrivePasswordParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--unsafe-drive-password', 'pw']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getIsPrivate().then((isPrivate) => expect(isPrivate).to.be.true);
			});
		});

		it('returns true when -p is provided', () => {
			const cmd = declareCommandWithParams(program, [UnsafeDrivePasswordParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '-p', 'pw']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getIsPrivate().then((isPrivate) => expect(isPrivate).to.be.true);
			});
		});

		it('returns true when --drive-key is provided', () => {
			const cmd = declareCommandWithParams(program, [DriveKeyParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--drive-key', 'key']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getIsPrivate().then((isPrivate) => expect(isPrivate).to.be.true);
			});
		});

		it('returns true when -k is provided', () => {
			const cmd = declareCommandWithParams(program, [DriveKeyParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '-k', 'key']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getIsPrivate().then((isPrivate) => expect(isPrivate).to.be.true);
			});
		});
	});

	describe('getRequiredWallet method', () => {
		it('returns a wallet when a valid --wallet-file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getRequiredWallet();
			});
		});

		it('returns a wallet when a valid --w file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getRequiredWallet();
			});
		});

		it('returns a wallet when a valid --seed-phrase option is provided', function () {
			// FIXME: it takes too long
			this.timeout(120_000);
			const cmd = declareCommandWithParams(program, [SeedPhraseParameter]);
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--seed-phrase',
				'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
			]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getRequiredWallet();
			});
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

		it('throws when none of --wallet-file, -w, --seed-phrase, or -s option are provided', () => {
			const cmd = declareCommandWithParams(program, []);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters
					.getRequiredWallet()
					.catch(() => null)
					.then((wallet) => expect(wallet).to.be.null);
			});
		});
	});

	describe('getOptionalWallet method', () => {
		it('returns a wallet when a valid --wallet-file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getOptionalWallet();
			});
		});

		it('returns a wallet when a valid --w file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters.getOptionalWallet();
			});
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
			const cmd = declareCommandWithParams(program, []);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletPromise = parameters.getOptionalWallet().catch(() => null);
				return walletPromise.then((wallet) => expect(wallet).to.be.null);
			});
		});
	});

	describe('getWalletAddress method', () => {
		it('returns the address of the wallet when a valid --wallet-file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--wallet-file', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletAddressPromise = parameters.getWalletAddress();
				return walletAddressPromise.then((walletAddress) =>
					expect(`${walletAddress}`).to.equal(`${expectedArweaveAddress}`)
				);
			});
		});

		it('returns the address of the wallet when a valid --w file is provided', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '-w', './test_wallet.json']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletAddressPromise = parameters.getWalletAddress();
				return walletAddressPromise.then((walletAddress) =>
					expect(`${walletAddress}`).to.equal(`${expectedArweaveAddress}`)
				);
			});
		});

		// Note: Redundant prolonged seed-phrase tests are commented out to save testing time

		// it('returns the address of the wallet when a valid --seed-phrase option is provided', () => {
		// declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 	const parameters = new ParametersHelper(options);
		// 	expect((`${await parameters.getWalletAddress()}`)).to.equal(expectedArweaveAddress);
		// });
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'--seed-phrase',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		// it('returns the address of the wallet when a valid -s option is provided', () => {
		// declareCommandWithParams(program, [SeedPhraseParameter], async (options) => {
		// 	const parameters = new ParametersHelper(options);
		// 	expect((`${await parameters.getWalletAddress()}`)).to.equal(expectedArweaveAddress);
		// });
		// 	CLICommand.parse(program, [
		// 		...baseArgv,
		// 		testCommandName,
		// 		'-s',
		// 		'alcohol wisdom allow used april recycle exhibit parent music field cabbage treat'
		// 	]);
		// });

		it('returns the address provided by the --address option value', () => {
			const cmd = declareCommandWithParams(program, [AddressParameter]);
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--address',
				'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
			]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletAddressPromise = parameters.getWalletAddress();
				return walletAddressPromise.then((walletAddress) =>
					expect(`${walletAddress}`).to.equal(`${expectedArweaveAddress}`)
				);
			});
		});

		it('returns the address provided by the -a option value', () => {
			const cmd = declareCommandWithParams(program, [AddressParameter]);
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'-a',
				'P8aFJizMVBl7HeoRAz2i1dNYkG_KoN7oB9tZpIw6lo4'
			]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletPromise = parameters.getWalletAddress();
				return walletPromise.then((walletAddress) =>
					expect(`${walletAddress}`).to.equal(`${expectedArweaveAddress}`)
				);
			});
		});

		it('throws when none of --wallet-file, -w, --seed-phrase, -s, --address, or -a option are provided', () => {
			const cmd = declareCommandWithParams(program, []);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const walletPromise = parameters.getWalletAddress().catch(() => null);
				return walletPromise.then((wallet) => expect(wallet).to.be.null);
			});
		});
	});

	describe('getDriveKey method', () => {
		it('returns the correct drive key given a valid --wallet-file and --unsafe-drive-password', () => {
			const cmd = declareCommandWithParams(program, [WalletFileParameter, UnsafeDrivePasswordParameter]);
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--wallet-file',
				'./test_wallet.json',
				'--unsafe-drive-password',
				'password'
			]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const driveKeyPromise = parameters.getDriveKey({
					driveId: EID('00000000-0000-0000-0000-000000000000')
				});
				return driveKeyPromise.then((driveKey) =>
					expect(urlEncodeHashKey(driveKey)).to.equal('Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg')
				);
			});
		});

		it('returns the drive key provided by the --drive-key option', () => {
			const cmd = declareCommandWithParams(program, [DriveKeyParameter]);
			CLICommand.parse(program, [
				...baseArgv,
				testCommandName,
				'--drive-key',
				'Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg'
			]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				return parameters
					.getDriveKey({ driveId: EID('00000000-0000-0000-0000-000000000000') })
					.then((driveKey) =>
						expect(urlEncodeHashKey(driveKey)).to.equal('Fqjb/eoHUHkoPwyTe52VUJkUkOtLg0eoWdV1u03DDzg')
					);
			});
		});

		it('throws when none of --wallet-file, -w, --seed-phrase, -s, --drive-key, or -k option are provided', () => {
			const cmd = declareCommandWithParams(program, []);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const driveKeyPromise = parameters
					.getDriveKey({ driveId: EID('00000000-0000-0000-0000-000000000000') })
					.catch(() => null);
				return driveKeyPromise.then((driveKey) => expect(driveKey).to.be.null);
			});
		});
	});

	describe('getMaxDepth method', () => {
		it('Defaults to zero', () => {
			const cmd = declareCommandWithParams(program, [MaxDepthParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const maxDepthPromise = parameters.getMaxDepth();
				return maxDepthPromise.then((maxDepth) => expect(maxDepth).to.equal(0));
			});
		});

		it('Does not accept a decimal', () => {
			const cmd = declareCommandWithParams(program, [MaxDepthParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--max-depth=.33']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const maxDepthPromise = parameters.getMaxDepth().catch(() => null);
				return maxDepthPromise.then((maxDepth) => expect(maxDepth).to.be.null);
			});
		});

		it('Does not accept a negative integer', () => {
			const cmd = declareCommandWithParams(program, [MaxDepthParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--max-depth=-100']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const maxDepthPromise = parameters.getMaxDepth().catch(() => null);
				return maxDepthPromise.then((maxDepth) => expect(maxDepth).to.be.null);
			});
		});

		it('Max depth is the MAX_SAFE_INTEGER when --all is specified', () => {
			const cmd = declareCommandWithParams(program, [MaxDepthParameter, AllParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--all']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const maxDepthPromise = parameters.getMaxDepth().catch(() => null);
				return maxDepthPromise.then((maxDepth) => expect(maxDepth).to.equal(Number.MAX_SAFE_INTEGER));
			});
		});

		it('Custom positive value is provided', () => {
			const cmd = declareCommandWithParams(program, [MaxDepthParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--max-depth=8']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const maxDepthPromise = parameters.getMaxDepth().catch(() => null);
				return maxDepthPromise.then((maxDepth) => expect(typeof maxDepth).to.equal('number'));
			});
		});
	});

	describe('isDryRun', () => {
		it('returns true when the parameter is specified', () => {
			const cmd = declareCommandWithParams(program, [DryRunParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName, '--dry-run']);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const dryRun = parameters.isDryRun();
				expect(dryRun).to.be.true;
			});
		});

		it('returns false when the parameter is omitted', () => {
			const cmd = declareCommandWithParams(program, [DryRunParameter]);
			CLICommand.parse(program, [...baseArgv, testCommandName]);
			return cmd.action.then((options) => {
				const parameters = new ParametersHelper(options);
				const dryRun = parameters.isDryRun();
				expect(dryRun).to.be.false;
			});
		});
	});
});
