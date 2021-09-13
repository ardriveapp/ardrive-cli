import { DriveKey } from '../arfsdao';
import { JWKWallet, Wallet, WalletDAO } from '../wallet_new';
import { ParameterName } from './parameter';
import * as fs from 'fs';
import { JWKInterface } from 'ardrive-core-js';
import {
	DriveAddressParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import Arweave from 'arweave';

/**
 * @type {CommonContext}
 * A class representing the context of the parameters
 */
export class CommonContext {
	private readonly walletDao: WalletDAO;

	/**
	 * @returns {CommonContext}
	 * @param {any} options The object containing the parameterName: value mapping
	 * @param {Arweave} arweave The arweave instance
	 * An immutable instance of CommonContext holding the parsed values of the parameters
	 */
	constructor(private readonly options: any, private readonly arweave: Arweave) {
		this.walletDao = new WalletDAO(this.arweave);
	}

	/**
	 * @returns {Promise<boolean>}
	 * Returns true when a drive password, drive key or wallet file is provided
	 */
	public async getIsPrivate(): Promise<boolean> {
		return !!(this.password || this.driveKey || (await this.getWallet().catch(() => false)));
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

	/**
	 * @type {string | undefined}
	 * A getter for the drive password
	 */
	public get password(): string | undefined {
		return this.getParameterValue(DrivePasswordParameter);
	}

	/**
	 * @type {DriveKey | undefined}
	 * A getter for the drive key
	 */
	public get driveKey(): DriveKey | undefined {
		const key = this.getParameterValue(DriveKeyParameter);
		return key ? Buffer.from(key) : undefined;
	}

	public get driveAddress(): string | undefined {
		const addr = this.getParameterValue(DriveAddressParameter);
		return addr;
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
