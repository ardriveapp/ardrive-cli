import { JWKWallet, Wallet, WalletDAO } from '../wallet_new';
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
	PrivateParameter
} from '../parameter_declarations';
import { cliWalletDao } from '..';
import { DriveID, DriveKey } from '../types';
import passwordPrompt from 'prompts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParameterOptions = any;

/**
 * @type {ParametersHelper}
 * A class that assists with handling Commander options during common ArDrive CLI workflows
 */
export class ParametersHelper {
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
			return await this.walletDao.generateJWKWallet(seedPhrase);
		}
		throw new Error('Neither a wallet file nor seed phrase was provided!');
	}

	public async getOptionalWallet(): Promise<Wallet | null> {
		return this.getRequiredWallet().catch(() => null);
	}

	public async getWalletAddress(): Promise<string> {
		return (
			this.getParameterValue(AddressParameter) || this.getRequiredWallet().then((wallet) => wallet.getAddress())
		);
	}

	public async getDriveKey(driveId: DriveID): Promise<DriveKey> {
		// Obtain drive key from one of:
		// • --drive-key param
		// • (--wallet-file or --seed-phrase) + (--unsafe-drive-password or --private password)
		const driveKey = this.getParameterValue(DriveKeyParameter);
		if (driveKey) {
			return Buffer.from(driveKey, 'base64');
		}

		const drivePassword = await this.getDrivePassword();
		if (drivePassword) {
			const wallet: JWKWallet = (await this.getRequiredWallet()) as JWKWallet;
			const derivedDriveKey: DriveKey = await deriveDriveKey(
				drivePassword,
				driveId,
				JSON.stringify(wallet.getPrivateKey())
			);
			return derivedDriveKey;
		}
		throw new Error(`No drive key or password provided!`);
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
				if (confirmedPassword !== promptedPassword) {
					console.log('Drive passwords do not match!');
					process.exit(1);
				}
			}
			if (!promptedPassword.password.length) {
				console.log('New drive password must not be empty when --private is specified!');
				process.exit(1);
			}

			return promptedPassword.password;
		}

		const unsafePassword = this.getParameterValue(UnsafeDrivePasswordParameter);
		if (!unsafePassword) {
			console.log(
				'Password not detected for private drive operation! Please provide a password via the --private option (recommended) or the --unsafe-drive-password option (not recommended).'
			);
			process.exit(1);
		}
		return unsafePassword;
	}

	public async getMaxDepth(defaultDepth: number): Promise<number> {
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
		const value = this.options[parameterName];
		if (!value) {
			throw new Error(`Required parameter ${parameterName} wasn't provided!`);
		}
		return value;
	}
}
