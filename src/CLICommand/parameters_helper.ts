import { JWKWallet, Wallet, WalletDAO } from '../wallet';
import { ParameterName } from './parameter';
import * as fs from 'fs';
import { deriveDriveKey, JWKInterface } from 'ardrive-core-js';
import {
	AddressParameter,
	AllParameter,
	DriveKeyParameter,
	UnsafeDrivePasswordParameter,
	MaxDepthParameter,
	SeedPhraseParameter,
	WalletFileParameter,
	PrivateParameter,
	BoostParameter
} from '../parameter_declarations';
import { cliWalletDao } from '..';
import { DriveID, DriveKey, ArweaveAddress, SeedPhrase, FeeMultiple } from '../types';
import passwordPrompt from 'prompts';
import { PrivateKeyData } from '../private_key_data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParameterOptions = any;

interface GetDriveKeyParams {
	driveId: DriveID;
	drivePassword?: string;
	useCache?: boolean;
}

/**
 * @type {ParametersHelper}
 * A class that assists with handling Commander options during common ArDrive CLI workflows
 */
export class ParametersHelper {
	private static readonly driveKeyCache: { [key: string]: DriveKey } = {};

	/**
	 * @returns {ParametersHelper}
	 * @param {any} options The object containing the parameterName: value mapping
	 * An immutable instance of ParametersHelper holding the parsed values of the parameters
	 */
	constructor(private readonly options: ParameterOptions, private readonly walletDao: WalletDAO = cliWalletDao) {}

	/**
	 * @returns {Promise<boolean>}
	 * Returns true when a drive password or drive key is provided
	 */
	public async getIsPrivate(): Promise<boolean> {
		return (
			this.getParameterValue(PrivateParameter) !== undefined ||
			this.getParameterValue(UnsafeDrivePasswordParameter) !== undefined ||
			this.getParameterValue(DriveKeyParameter) !== undefined
		);
	}

	/**
	 * @returns {Promise<Wallet>}
	 * Will return a wallet instance created from the seed phrase or the walletFile.
	 * Throws an error if a wallet can't be created.
	 */
	public async getRequiredWallet(): Promise<Wallet> {
		const walletFile = this.getParameterValue(WalletFileParameter);
		const seedPhrase = this.getParameterValue(SeedPhraseParameter);
		if (walletFile) {
			const walletFileData = fs.readFileSync(walletFile, { encoding: 'utf8', flag: 'r' });
			const walletJSON = JSON.parse(walletFileData);
			const walletJWK: JWKInterface = walletJSON as JWKInterface;
			return new JWKWallet(walletJWK);
		} else if (seedPhrase) {
			return await this.walletDao.generateJWKWallet(new SeedPhrase(seedPhrase));
		}
		throw new Error('Neither a wallet file nor seed phrase was provided!');
	}

	public async getOptionalWallet(): Promise<Wallet | null> {
		return this.getRequiredWallet().catch(() => null);
	}

	public async getWalletAddress(): Promise<ArweaveAddress> {
		const address = this.getParameterValue(AddressParameter);
		if (address) {
			return new ArweaveAddress(address);
		}

		return this.getRequiredWallet().then((wallet) => wallet.getAddress());
	}

	public getOptionalBoostSetting(): FeeMultiple | undefined {
		const boost = this.getParameterValue(BoostParameter);
		return boost ? new FeeMultiple(+boost) : undefined;
	}

	public async getPrivateKeyData(): Promise<PrivateKeyData> {
		// Gather optional private parameters
		const driveKey = this.getParameterValue(DriveKeyParameter);
		const wallet = await this.getOptionalWallet();
		const password = await ((): Promise<string | undefined> => {
			if (
				// If private param specified or an unsafe password param is provided
				this.getParameterValue(PrivateParameter) !== undefined ||
				this.getParameterValue(UnsafeDrivePasswordParameter) !== undefined
			) {
				return this.getDrivePassword();
			}
			return Promise.resolve(undefined);
		})();

		return new PrivateKeyData({
			password,
			driveKeys: driveKey ? [Buffer.from(driveKey, 'base64')] : undefined,
			wallet: (wallet as JWKWallet) ?? undefined
		});
	}

	public async getDriveKey({ driveId, drivePassword, useCache = false }: GetDriveKeyParams): Promise<DriveKey> {
		// Obtain drive key from one of:
		// • --drive-key param
		// • (--wallet-file or --seed-phrase) + (--unsafe-drive-password or --private password)

		if (useCache) {
			const cachedDriveKey = ParametersHelper.driveKeyCache[`${driveId}`];
			if (cachedDriveKey) {
				return cachedDriveKey;
			}
		}

		const driveKey = this.getParameterValue(DriveKeyParameter);
		if (driveKey) {
			const paramDriveKey = Buffer.from(driveKey, 'base64');
			ParametersHelper.driveKeyCache[`${driveId}`] = paramDriveKey;
			return paramDriveKey;
		}

		drivePassword = drivePassword ?? (await this.getDrivePassword());
		if (drivePassword) {
			const wallet: JWKWallet = (await this.getRequiredWallet()) as JWKWallet;
			const derivedDriveKey: DriveKey = await deriveDriveKey(
				drivePassword,
				`${driveId}`,
				JSON.stringify(wallet.getPrivateKey())
			);
			ParametersHelper.driveKeyCache[`${driveId}`] = derivedDriveKey;
			return derivedDriveKey;
		}
		throw new Error(`No drive key or password provided for drive ID ${driveId}!`);
	}

	public async getDrivePassword(isForNewDrive = false): Promise<string> {
		if (this.getParameterValue(PrivateParameter)) {
			// Try to get password from STDIN, then ENV.ARDRIVE_DRIVE_PW, then interactive secure prompt
			try {
				const stdInPassword = fs.readFileSync(process.stdin.fd).toString().replace(/\n*$/, '');
				if (stdInPassword) {
					return stdInPassword;
				}
			} catch (_err) {
				// Do nothing
			}

			const envPassword = process.env['ARDRIVE_DRIVE_PW'];
			if (envPassword) {
				return envPassword;
			}

			const promptedPassword = await passwordPrompt({
				type: 'text',
				name: 'password',
				style: 'password',
				message: isForNewDrive ? 'Enter new drive password:' : 'Enter drive password:'
			});
			if (isForNewDrive) {
				const confirmedPassword = await passwordPrompt({
					type: 'text',
					name: 'password',
					style: 'password',
					message: 'Re-enter new drive password: '
				});
				if (confirmedPassword.password !== promptedPassword.password) {
					throw new Error('Drive passwords do not match!');
				}
			}
			if (!promptedPassword.password.length) {
				throw new Error('New drive password must not be empty when --private is specified!');
			}

			return promptedPassword.password;
		}

		const unsafePassword = this.getParameterValue(UnsafeDrivePasswordParameter);
		if (!unsafePassword) {
			throw new Error(
				'Password not detected for private drive operation! Please provide a password via the --private option (recommended) or the --unsafe-drive-password option (not recommended).'
			);
		}
		return unsafePassword;
	}

	public async getMaxDepth(defaultDepth = 0): Promise<number> {
		if (this.getParameterValue(AllParameter)) {
			return Number.MAX_SAFE_INTEGER;
		}

		const maxDepthValue = Number(this.getParameterValue(MaxDepthParameter) ?? defaultDepth);

		if (!Number.isInteger(maxDepthValue) || maxDepthValue < 0) {
			throw new Error('maxDepth should be a non-negative integer!');
		}

		return maxDepthValue;
	}

	/**
	 * @param {ParameterName} parameterName
	 * @returns {string | undefined}
	 * Returns the string value for the specific parameter; returns undefined if not set
	 */
	public getParameterValue(parameterName: ParameterName): string | undefined {
		const value = this.options[parameterName];
		return value;
	}

	/**
	 * @param {ParameterName} parameterName
	 * @returns {string | undefined}
	 * Returns the string value for the specific parameter; throws an error if not set
	 */
	public getRequiredParameterValue(parameterName: ParameterName): string {
		// FIXME: it could also return an array or a boolean!
		const value = this.options[parameterName];
		if (!value) {
			throw new Error(`Required parameter ${parameterName} wasn't provided!`);
		}
		return value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public getRequiredParameterValueTyped<T>(parameterName: ParameterName, closure: (a: any) => T): T {
		// FIXME: it could also return an array or a boolean!
		const value = this.options[parameterName];
		if (!value) {
			throw new Error(`Required parameter ${parameterName} wasn't provided!`);
		}
		return closure(value);
	}
}
