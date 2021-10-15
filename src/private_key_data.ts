import { deriveDriveKey, driveDecrypt, Utf8ArrayToStr } from 'ardrive-core-js';
import { CipherIV, DriveID, DriveKey } from './types';
import { JWKWallet } from './wallet_new';

type DriveIdKeyPair = { [key: string /* DriveID */]: DriveKey };

export type EntityMetaDataTransactionData = { [key: string]: string | number };

// Users may optionally supply any drive keys, a password, or a wallet
interface PrivateKeyDataParams {
	readonly driveKeys?: DriveKey[];
	readonly password?: string;
	readonly wallet?: JWKWallet;
}

/**
 * A utility class that uses optional private key data to safely decrypt metadata
 * transaction data (the data JSON). Upon a successful decryption, the class
 * will cache the verified driveId and driveKey as a pair for future use.
 */
export class PrivateKeyData {
	private readonly password?: string;
	private readonly wallet?: JWKWallet;

	// Drive IDs are paired with their Drive Keys upon successful decryption
	// TODO: Migrate this to ArFS Cache so it can persist between commands
	private readonly driveKeyCache: DriveIdKeyPair = {};

	// Drive keys provided by the user are initially "unpaired"
	// until we successfully decrypt a drive with them
	private unPairedDriveKeys: DriveKey[];

	constructor({ password, driveKeys, wallet }: PrivateKeyDataParams) {
		this.unPairedDriveKeys = driveKeys ?? [];
		this.password = password;
		this.wallet = wallet;
	}

	/**
	 * Safely decrypts a private data buffer into a decrypted transaction data
	 *
	 * @throws when the provided driveKey or cipher fails to decrypt the transaction data
	 */
	public async safelyDecryptToJson<T extends EntityMetaDataTransactionData>(
		cipherIV: CipherIV,
		driveId: DriveID,
		dataBuffer: Buffer
	): Promise<T | false> {
		// Check for cached key that is matching driveId first
		const cachedDriveKey = this.driveKeyForDriveId(driveId);
		if (cachedDriveKey) {
			return this.decryptToJson<T>(cipherIV, dataBuffer, cachedDriveKey);
		}

		// Try any unpaired drive keys
		if (this.unPairedDriveKeys.length > 0) {
			for await (const driveKey of this.unPairedDriveKeys) {
				try {
					const decryptedDriveJSON = await this.decryptToJson<T>(cipherIV, dataBuffer, driveKey);

					// Correct key, add this pair to the cache
					this.driveKeyCache[driveId] = driveKey;
					this.unPairedDriveKeys = this.unPairedDriveKeys.filter((k) => k === driveKey);

					return decryptedDriveJSON;
				} catch {
					// Wrong key, continue
				}
			}
		}

		// If we have a password and a wallet, we can derive a drive key and try it
		if (this.password && this.wallet) {
			const derivedDriveKey: DriveKey = await deriveDriveKey(
				this.password,
				driveId,
				JSON.stringify(this.wallet.getPrivateKey())
			);

			try {
				const decryptedDriveJSON = await this.decryptToJson<T>(cipherIV, dataBuffer, derivedDriveKey);

				// Correct key, add this pair to the cache
				this.driveKeyCache[driveId] = derivedDriveKey;

				return decryptedDriveJSON;
			} catch (error) {
				// Wrong key, continue
			}
		}

		// Decryption is not possible, return as false
		return false;
	}

	/**
	 * Decrypts a private data buffer into a decrypted transaction data
	 *
	 * @throws when the provided driveKey or cipher fails to decrypt the transaction data
	 */
	public async decryptToJson<T extends EntityMetaDataTransactionData>(
		cipherIV: CipherIV,
		encryptedDataBuffer: Buffer,
		driveKey: DriveKey
	): Promise<T> {
		const decryptedDriveBuffer: Buffer = await driveDecrypt(cipherIV, driveKey, encryptedDataBuffer);
		const decryptedDriveString: string = await Utf8ArrayToStr(decryptedDriveBuffer);
		return JSON.parse(decryptedDriveString);
	}

	/** Synchronously returns a driveKey from the cache by its driveId */
	public driveKeyForDriveId(driveId: DriveID): DriveKey | false {
		return this.driveKeyCache[driveId] ?? false;
	}
}
