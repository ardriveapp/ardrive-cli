import { ParameterName } from './parameter';
import * as fs from 'fs';
import {
	AddressParameter,
	AllParameter,
	DriveKeyParameter,
	UnsafeDrivePasswordParameter,
	MaxDepthParameter,
	SeedPhraseParameter,
	WalletFileParameter,
	PrivateParameter,
	ReplaceParameter,
	AskParameter,
	SkipParameter,
	BoostParameter,
	GatewayParameter,
	DryRunParameter,
	MetaDataFileParameter,
	MetaDataGqlTagsParameter,
	MetadataJsonParameter,
	DataGqlTagsParameter,
	TurboUrlParameter
} from '../parameter_declarations';
import { cliWalletDao } from '..';
import passwordPrompt from 'prompts';
import {
	DriveID,
	DriveKey,
	WalletDAO,
	Wallet,
	JWKWallet,
	SeedPhrase,
	ArweaveAddress,
	ADDR,
	FeeMultiple,
	PrivateKeyData,
	deriveDriveKey,
	FileNameConflictResolution,
	replaceOnConflicts,
	skipOnConflicts,
	upsertOnConflicts,
	askOnConflicts,
	EntityKey,
	CustomMetaData,
	assertCustomMetaData,
	CustomMetaDataJsonFields
} from 'ardrive-core-js';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { deriveIpfsCid } from '../utils/ipfs_utils';
import { turboProdUrl } from 'ardrive-core-js/lib/utils/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParameterOptions = any;

const DEFAULT_GATEWAY = 'https://arweave.net:443';
const ARWEAVE_GATEWAY_ENV_VAR = 'ARWEAVE_GATEWAY';
const TURBO_URL_ENV_VAR = 'TURBO_URL';

interface GetDriveKeyParams {
	driveId: DriveID;
	drivePassword?: string;
	useCache?: boolean;
}

interface GetCustomMetaDataWithIpfsCidParameter {
	localFilePath: FilePath;
}

type FilePath = string;

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
			return ADDR(address);
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
			driveKeys: driveKey ? [new EntityKey(Buffer.from(driveKey, 'base64'))] : undefined,
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
			const paramDriveKey = new EntityKey(Buffer.from(driveKey, 'base64'));
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

	public getFileNameConflictResolution(): FileNameConflictResolution {
		if (this.getParameterValue(ReplaceParameter)) {
			return replaceOnConflicts;
		}

		if (this.getParameterValue(SkipParameter)) {
			return skipOnConflicts;
		}

		if (this.getParameterValue(AskParameter)) {
			return askOnConflicts;
		}

		return upsertOnConflicts;
	}

	/**
	 * @param {ParameterName} parameterName
	 * @returns {string | undefined}
	 * Returns the string value for the specific parameter; returns undefined if not set
	 */
	public getParameterValue<T = string>(
		parameterName: ParameterName,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mapFunc: (input: any) => T = (input: any) => input as T
	): T | undefined {
		const value = this.options[parameterName];
		return value ? mapFunc(value) : value;
	}

	/**
	 * @param {ParameterName} parameterName
	 * @param {(input: any) => T} mapFunc A function that maps the parameter value into a T instance
	 * @returns {string | undefined}
	 * @throws - When the required parameter value has a falsy value
	 * Returns the string value for the specific parameter
	 */
	public getRequiredParameterValue<T = string>(
		parameterName: ParameterName,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mapFunc: (input: any) => T = (input: any) => input as T
	): T {
		const value = this.options[parameterName];
		if (!value) {
			throw new Error(`Required parameter ${parameterName} wasn't provided!`);
		}
		return mapFunc(value);
	}

	async getCustomMetaDataWithIpfsCid({
		localFilePath
	}: GetCustomMetaDataWithIpfsCidParameter): Promise<CustomMetaData> {
		const customMetaDataClone: CustomMetaData = Object.assign({}, this.getCustomMetaData());

		const customIpfsTag = customMetaDataClone.dataGqlTags?.['IPFS-Add'];
		if (customIpfsTag) {
			throw new Error(
				`You cannot pass the --add-ipfs-tag flag and set the custom IPFS-Add metadata item. Found: { 'IPFS-Add': ${JSON.stringify(
					customIpfsTag
				)}}`
			);
		} else {
			const fileStream = fs.createReadStream(localFilePath);
			const cidHash = await deriveIpfsCid(fileStream);

			if (!customMetaDataClone.dataGqlTags) {
				customMetaDataClone.dataGqlTags = {};
			}
			customMetaDataClone.dataGqlTags['IPFS-Add'] = cidHash;
		}

		return customMetaDataClone;
	}

	public getCustomMetaData(): CustomMetaData | undefined {
		const metaDataPath = this.getParameterValue(MetaDataFileParameter);

		const customMetaData = (() => {
			if (metaDataPath) {
				return this.readMetaDataFromPath(metaDataPath);
			}

			const customMetaData: CustomMetaData = {};
			const metaDataGqlTags = this.mapMetaDataArrayToCustomMetaDataShape(
				this.getParameterValue<string[]>(MetaDataGqlTagsParameter)
			);
			if (metaDataGqlTags) {
				Object.assign(customMetaData, { metaDataGqlTags });
			}

			const dataGqlTags = this.mapMetaDataArrayToCustomMetaDataShape(
				this.getParameterValue<string[]>(DataGqlTagsParameter)
			);
			if (dataGqlTags) {
				Object.assign(customMetaData, { dataGqlTags });
			}

			const metaDataJson = this.getParameterValue<string>(MetadataJsonParameter);

			if (metaDataJson) {
				Object.assign(customMetaData, { metaDataJson: this.parseMetaDataJson(metaDataJson) });
			}
			return customMetaData;
		})();

		if (Object.keys(customMetaData).length > 0) {
			assertCustomMetaData(customMetaData);
			return customMetaData;
		}

		return undefined;
	}

	private readMetaDataFromPath(path: string): CustomMetaData {
		// Read tag file or throw fs path error or throw JSON parse error
		const tagFile = fs.readFileSync(path, { encoding: 'utf8' });
		return JSON.parse(tagFile);
	}

	private mapMetaDataArrayToCustomMetaDataShape(
		metadata: string[] | undefined
	): CustomMetaDataCliArrayInput | undefined {
		if (metadata === undefined || metadata.length === 0) {
			return undefined;
		}
		this.assertEvenTags(metadata);

		const metaData: CustomMetaDataCliArrayInput = {};
		let temp: string | null = null;

		for (const val of metadata) {
			if (temp === null) {
				// val is tag Name
				temp = val;
			} else {
				// val is tag Value
				metaData[temp] = val;
				temp = null;
			}
		}

		return metaData;
	}

	private assertEvenTags(tags?: string[]): void {
		if (tags && tags.length % 2 !== 0) {
			throw Error('User must provide an even number custom metadata inputs! e.g: --metadata-json "NAME" "VALUE"');
		}
	}

	private parseMetaDataJson(rawMetaDataJsonString: string): CustomMetaDataJsonFields {
		return JSON.parse(rawMetaDataJsonString);
	}

	/**
	 * Gathers a valid gateway URL from user provided gateway parameter,
	 * an environment variable, or returns the default arweave gateway
	 *
	 * @throws on user provided gateways that are incompatible with URL class constructor
	 * @throws when hostName cannot be derived from a user provided gateway
	 */
	public getGateway(): URL {
		const userProvidedURL = (() => {
			// Use optional --gateway supplied parameter as first choice
			const gatewayFromParam = this.getParameterValue(GatewayParameter);
			if (gatewayFromParam) {
				return new URL(gatewayFromParam);
			}

			// Then check for an ENV provided gateway
			const envGateway = process.env[ARWEAVE_GATEWAY_ENV_VAR];
			if (envGateway) {
				return new URL(envGateway);
			}

			return undefined;
		})();

		if (!userProvidedURL) {
			// Return default CLI Arweave if no gateway can be derived from the user
			return new URL(DEFAULT_GATEWAY);
		}

		if (userProvidedURL.hostname === '') {
			// Ensure a valid host name was provided to be used in Arweave.init()
			throw new TypeError(`Host name could not be determined from provided URL: ${userProvidedURL.href}`);
		}
		return userProvidedURL;
	}

	/**
	 * Gathers a valid turbo URL from user provided turbo parameter,
	 * an environment variable, or returns the default arweave turbo
	 *
	 * @throws on user provided turbos that are incompatible with URL class constructor
	 * @throws when hostName cannot be derived from a user provided turbo
	 */
	public getTurbo(): URL {
		const userProvidedURL = (() => {
			// Use optional --turbo-url supplied parameter as first choice
			const turboFromParam = this.getParameterValue(TurboUrlParameter);
			if (turboFromParam) {
				return new URL(turboFromParam);
			}

			// Then check for an ENV provided turbo
			const envTurbo = process.env[TURBO_URL_ENV_VAR];
			if (envTurbo) {
				return new URL(envTurbo);
			}

			return undefined;
		})();

		if (!userProvidedURL) {
			// Return default CLI turbo if no turbo url can be derived from the user
			return new URL(turboProdUrl);
		}

		if (userProvidedURL.hostname === '') {
			// Ensure a valid host name was provided to be used in Arweave.init()
			throw new TypeError(`Host name could not be determined from provided URL: ${userProvidedURL.href}`);
		}
		return userProvidedURL;
	}

	public isDryRun(): boolean {
		const dryRun = this.getParameterValue(DryRunParameter);
		return !!dryRun;
	}
}

type CustomMetaDataCliArrayInput = Record<string, string>;
