import { JWKWallet, Wallet, WalletDAO } from '../wallet_new';
import { ParameterName } from './parameter';
import * as fs from 'fs';
import { deriveDriveKey, JWKInterface } from 'ardrive-core-js';
import {
	AddressParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { DriveID } from '../types';
import { cliWalletDao } from '..';

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
	constructor(private readonly options: any, private readonly walletDao: WalletDAO = cliWalletDao) {}

	/**
	 * @returns {Promise<boolean>}
	 * Returns true when a drive password or drive key is provided
	 */
	public async getIsPrivate(): Promise<boolean> {
		return (
			this.getParameterValue(DrivePasswordParameter) !== undefined ||
			this.getParameterValue(DriveKeyParameter) !== undefined
		);
	}

	/**
	 * @returns {Promise<Wallet>}
	 * Will return a wallet instance created from the seed phrase or the walletFile
	 */
	public async getWallet(): Promise<Wallet> {
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
		throw new Error('No wallet file neither seed phrase provided!');
	}

	public async getWalletAddress(): Promise<string> {
		return this.getParameterValue(AddressParameter) || this.getWallet().then((wallet) => wallet.getAddress());
	}

	public async getDriveKey(driveId: DriveID): Promise<Buffer> {
		const driveKey = this.getParameterValue(DriveKeyParameter);
		if (driveKey) {
			return Buffer.from(driveKey);
		}
		const drivePassword = this.getParameterValue(DrivePasswordParameter);
		if (drivePassword) {
			const wallet: JWKWallet = (await this.getWallet()) as JWKWallet;
			const derivedDriveKey: Buffer = await deriveDriveKey(
				drivePassword,
				driveId,
				JSON.stringify(wallet.getPrivateKey())
			);
			return derivedDriveKey;
		}
		throw new Error(`No drive key or password provided!`);
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
