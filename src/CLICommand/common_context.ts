import { JWKWallet, Wallet, WalletDAO } from '../wallet_new';
import { ParameterName } from './parameter';
import * as fs from 'fs';
import { deriveDriveKey, JWKInterface } from 'ardrive-core-js';
import {
	DriveKeyParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { DriveID, DriveKey } from '../types';

/**
 * @type {CommonContext}
 * A class representing the context of the parameters
 */
export class CommonContext {
	/**
	 * @returns {CommonContext}
	 * @param {any} options The object containing the parameterName: value mapping
	 * An immutable instance of CommonContext holding the parsed values of the parameters
	 */
	constructor(private readonly options: any, private readonly walletDao: WalletDAO) {}

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

	public async getDriveKey(driveId: DriveID): Promise<DriveKey> {
		const driveKey = this.getParameterValue(DriveKeyParameter);
		if (driveKey) {
			return Buffer.from(driveKey);
		}
		const drivePassword = this.getParameterValue(DrivePasswordParameter);
		if (drivePassword) {
			const wallet: JWKWallet = (await this.getWallet()) as JWKWallet;
			const derivedDriveKey: DriveKey = await deriveDriveKey(
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
}
