#!/usr/bin/env node

import * as fs from 'fs';
import { ArDrive } from './ardrive';
import { ArFSDAO } from './arfsdao';
import { Wallet, JWKWallet, WalletDAO } from './wallet_new';
import Arweave from 'arweave';
import { CLICommand } from './CLICommand';
import {
	ArAmountParameter,
	ConfirmationsParameter,
	DestinationAddressParameter,
	DestinationFileNameParameter,
	DriveIdParameter,
	DriveKeyParameter,
	DriveNameParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	LocalFilePathParameter,
	LocalFilesParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	TransactionIdParameter,
	WalletFileParameter
} from './parameter_declarations';
import { CommonContext } from './CLICommand/common_context';
import { JWKInterface } from './wallet';
import fetch from 'node-fetch';

/* eslint-disable no-console */

export const arweave = Arweave.init({
	host: 'arweave.net', // Arweave Gateway
	//host: 'arweave.dev', // Arweave Dev Gateway
	port: 443,
	protocol: 'https',
	timeout: 600000
});

export const walletDao = new WalletDAO(arweave);

// TODO: remove when fully de-coupled
const program = CLICommand.program;

new CLICommand({
	name: 'create-drive',
	parameters: [WalletFileParameter, SeedPhraseParameter, DriveNameParameter, DrivePasswordParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet: Wallet = await context.getWallet();
		const ardrive = new ArDrive(new ArFSDAO(wallet, arweave));
		const createDriveResult = await (async function () {
			if (await context.getIsPrivate()) {
				return ardrive.createPrivateDrive(options.driveName, options.drivePassword);
			} else {
				return ardrive.createPublicDrive(options.driveName);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		process.exit(0);
	}
});

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet: Wallet | false = await context.getWallet().catch(() => {
			return false;
		});
		const address = wallet ? await wallet.getAddress() : context.getParameterValue(DriveAddressParameter);
		if (address) {
			const balance = await walletDao.getAddressWinstonBalance(address);
			console.log(balance);
			process.exit(0);
		} else {
			console.log(`No wallet provided`);
			process.exit(1);
		}
	}
});

new CLICommand({
	name: 'get-address',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new CommonContext(options, arweave);
		const address = await context
			.getWallet()
			.then((wallet) => {
				return wallet.getAddress();
			})
			.catch(() => {
				console.log(`No wallet provided`);
				process.exit(1);
			});
		console.log(address);
		process.exit(0);
	}
});

function readJWKFile(path: string): Wallet {
	const walletFileData = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
	const walletJSON = JSON.parse(walletFileData);
	const walletJWK = walletJSON as JWKInterface;
	const wallet = new JWKWallet(walletJWK);
	return wallet;
}

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options, arweave);
		const wallet = await context.getWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`arAmount: ${options.arAmount}`);
		console.log(`destAddress: ${options.destAddress}`);
		console.log(await walletDao.getAddressWinstonBalance(options.destAddress));
		console.log(
			JSON.stringify(
				await walletDao.sendARToAddress(+options.arAmount, wallet, options.destAddress, [
					{ name: 'appName', value: 'ArDrive-CLI' },
					{ name: 'appVersion', value: '2.0' },
					{ name: 'trxType', value: 'transfer' },
					{ name: 'foo', value: 'bar' }
				]),
				null,
				4
			)
		);
		process.exit(0);
	}
});

new CLICommand({
	name: 'generate-seedphrase',
	parameters: [],
	async action() {
		const seedPhrase = await walletDao.generateSeedPhrase();
		console.log(JSON.stringify(seedPhrase));
		process.exit(0);
	}
});

new CLICommand({
	name: 'generate-wallet',
	parameters: [SeedPhraseParameter],
	async action(options) {
		if (!options.seedPhrase) {
			throw new Error('Missing required seed phrase');
		}
		const wallet = await walletDao.generateJWKWallet(options.seed);
		console.log(JSON.stringify(wallet));
		process.exit(0);
	}
});

async function fetchMempool(): Promise<string[]> {
	const response = await fetch('https://arweave.net/tx/pending');
	return response.json();
}

new CLICommand({
	name: 'get-mempool',
	parameters: [],
	async action() {
		const transactionsInMempool = await fetchMempool();

		console.log(JSON.stringify(transactionsInMempool, null, 4));
		process.exit(0);
	}
});

new CLICommand({
	name: 'tx-status',
	parameters: [TransactionIdParameter, ConfirmationsParameter],
	async action(options) {
		const { txId, confirmations } = options;
		const transactionsInMempool = await fetchMempool();
		const pending = transactionsInMempool.includes(txId);
		const confirmationAmount = confirmations ?? 15;

		if (pending) {
			console.log(`${txId}: Pending`);
			process.exit(0);
		}

		const confStatus = (await arweave.transactions.getStatus(txId)).confirmed;

		if (!confStatus?.block_height) {
			console.log(`${txId}: Not found`);
			process.exit(1);
		}

		if (confStatus?.number_of_confirmations >= confirmationAmount) {
			console.log(
				`${txId}: Mined at block height ${confStatus.block_height} with ${confStatus.number_of_confirmations} confirmations`
			);
		} else {
			console.log(
				`${txId}: Confirming at block height ${confStatus.block_height} with ${confStatus.number_of_confirmations} confirmations`
			);
		}

		process.exit(0);
	}
});
interface UploadFileParameter {
	parentFolderId: string;
	localFilePath: string;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: string;
}

new CLICommand({
	name: 'upload-file',
	parameters: [
		ParentFolderIdParameter,
		LocalFilePathParameter,
		DestinationFileNameParameter,
		LocalFilesParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const filesToUpload: UploadFileParameter[] = (function (): UploadFileParameter[] {
			if (options.drivePassword && options.driveKey) {
				console.log(`Can not use --drive-password in conjunction with --drive-key`);
				process.exit(1);
			}
			if (options.localFiles) {
				if (options.localFilePath) {
					console.log(`Can not use --local-files in conjunction with --localFilePath`);
					process.exit(1);
				}
				const COLUMN_SEPARATOR = ',';
				const ROW_SEPARATOR = '.';
				const csvRows = options.localFiles.split(ROW_SEPARATOR);
				const fileParameters: UploadFileParameter[] = csvRows.map((row: string) => {
					const csvFields = row.split(COLUMN_SEPARATOR).map((f: string) => f.trim());
					const [parentFolderId, localFilePath, destinationFileName, drivePassword, driveKey] = csvFields;
					return {
						parentFolderId,
						localFilePath,
						destinationFileName,
						drivePassword,
						driveKey
					};
				});
				return fileParameters;
			}
			const singleParameter = {
				parentFolderId: options.parentFolderId,
				localFilePath: options.localFilePath,
				destinationFileName: options.destFileName,
				drivePassword: options.drivePassword,
				driveKey: options.driveKey
			};
			if (!options.parentFolderId || !options.localFilePath) {
				console.log(`Bad file: ${JSON.stringify(singleParameter)}`);
				process.exit(1);
			}
			return [singleParameter];
		})();
		if (filesToUpload.length) {
			const wallet = readJWKFile(options.walletFile);
			const arDrive = new ArDrive(new ArFSDAO(wallet, arweave));
			await Promise.all(
				filesToUpload.map(async (fileToUpload) => {
					if (!fileToUpload.parentFolderId || !fileToUpload.localFilePath) {
						console.log(`Bad file: ${JSON.stringify(fileToUpload)}`);
						process.exit(1);
					}
					const result = await (async () => {
						if (options.drivePassword) {
							return arDrive.uploadPrivateFile(
								fileToUpload.parentFolderId,
								fileToUpload.localFilePath,
								options.drivePassword,
								fileToUpload.destinationFileName
							);
						} else {
							return arDrive.uploadPublicFile(
								fileToUpload.parentFolderId,
								fileToUpload.localFilePath,
								fileToUpload.destinationFileName
							);
						}
					})();
					console.log(JSON.stringify(result, null, 4));
				})
			);
			process.exit(0);
		}
		console.log(`No files to upload`);
		process.exit(1);
	}
});

new CLICommand({
	name: 'drive-info',
	parameters: [
		DriveIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const context = new CommonContext(options, arweave);
		const wallet = await context.getWallet();
		const arDrive = new ArDrive(new ArFSDAO(wallet, arweave));
		const driveId: string = options.driveId;
		// const getAllRevisions: boolean = options.getAllRevisions;
		const result = await arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});

// Process command line inputs
const opts = program.opts();
//console.log(`opts: ${Object.getOwnPropertyNames(opts)}`);
//console.log(`commands: ${program.commands}`);
if (Object.getOwnPropertyNames(opts).length === 0 && Object.getOwnPropertyNames(program.arguments).length === 0) {
	console.log('TODO: Show help');
	//showHelp();
	process.exit(0);
}

if (opts.help) {
	showHelp();
	process.exit(0);
}

function showHelp() {
	console.log(`
Usage: <this script> <action> <options>

TODO: ADD EXIT STATUSES AND MEANING FOR EACH COMMAND

Examples:
ardrive --help
ardrive create-drive --wallet-file <path to my wallet> --drive-name "Chimichanga" --accept-fees --wait

Actions and Action-specific Options:

create-drive: creates a new drive (and its corresponding root folder)
	--drive-name: The name of the drive to be created
	--drive-password: the encryption password for the private drive (OPTIONAL)
	• When provided, creates the drive as a private drive. Public drive otherwise.

rename-drive:
	--drive-id: the ArFS drive ID for the drive
	--drive-name: NEW drive name for drive with ID provided in --drive-id option
	--drive-password: the drive password
	• Required only for private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key
	• Required only for private drives
	• Can NOT be used in conjunction with --drive-password

upload-file:
	--parent-folder-id: the ArFS folder ID for the folder in which this file will reside (i.e. its parent folder)
	• To upload the file to the root of a drive, use the root folder ID of the drive
	--local-file-path: the path on the local filesystem for the file that will be uploaded
	--dest-file-name: (OPTIONAL) a destination file name to use when uploaded to ArDrive
	--local-files: a path to a csv (tab delimited) file containing rows of data for the following columns:
	• CSV Columns
		• local file path
		• destination file name (optional)
		• parent folder ID (optional)
		• --parent-folder-id used, otherwise
		• all parent folder IDs should reside in the same drive
	• Can NOT be used in conjunction with --local-file-path
	--drive-password: the drive password for the parent drive of the folder identified by --parent-folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key for the parent drive of the folder identified by --parent-folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-password

rename-file:
	--file-id: the ArFS file ID for the file to rename
	--file-name: the new name for the file
	--drive-password: the drive password for the parent drive of the file
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-key or --file-key
	--drive-key: the drive key for the parent drive of the file
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-password or --file-key
	--file-key: the file key of the file to be renamed
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-password or --drive-key

create-folder:
	--parent-folder-id: the ArFS folder ID for the folder in which this folder will reside (i.e. its parent folder)
	• To upload the folder to the root of a drive, use the root folder ID of the drive
	--folder-name: a destination file name to use when uploaded to ArDrive
	--drive-password: the drive password for the parent drive of the folder identified by --parent-folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key for the parent drive of the folder identified by --parent-folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-password

rename-folder:
	--folder-id: the ArFS folder ID for the folder to rename
	--folder-name: the new name for the folder
	--drive-password: the drive password for the parent drive of the folder identified by --folder-id
	• Required only for folders residing in private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key for the parent drive of the folder identified by --folder-id
	• Required only for folders residing in private drives
	• Can NOT be used in conjunction with --drive-password

move-file:
	--file-id: the ArFS file ID for the file to move
	--parent-folder-id: the folder ID for the new parent folder of the file
	• parent folder IDs must reside in the same drive
	• to "move" files across drive, use the "copy-file" action instead
	--drive-password: the drive password for the parent drive of the file
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-key or --file-key
	--drive-key: the drive key for the parent drive of the file
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-password or --file-key
	--file-key: the file key of the file to be moved
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-password or --drive-key

move-folder:
	--folder-id: the ArFS folder ID for the folder to rename
	--parent-folder-id: the ArFS folder ID for the folder to which this folder should be moved
	• To upload the folder to the root of a drive, use the root folder ID of the drive
	• parent folder IDs must reside in the same drive
	• to "move" files across drive, use the "copy-file" action instead
	--drive-password: the drive password for the parent drive of the folder identified by --folder-id
	• Required only for folders residing in private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key for the parent drive of the folder identified by --folder-id
	• Required only for folders residing in private drives
	• Can NOT be used in conjunction with --drive-password

restore-version:
	• see "get-versions" action for held retrieving data transaction IDs
	--tx-id: the Arweave data transaction ID for the data version to "restore"
	--file-id: the ArFS file ID for the file to roll back
	--drive-password: the drive password for the parent drive of the file or folder
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-key or --file-key
	--drive-key: the drive key for the parent drive of the file or folder
	• Required only for parent folders residing in private drives
	• Can NOT be used in conjunction with --drive-password or --file-key
	--file-key: the file key of the file
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-password or --drive-key

copy-file:

copy-folder:

edit-file:
	// TODO: Figure out how we want to support this. Depends on ArFS 0.12 updates.
	--file-id: the ArFS file ID for the file to roll back
	• Can NOT be used in conjunction with --folder-id
	--folder-id: the ArFS folder ID for the folder to roll back
	• Can NOT be used in conjunction with --file-id
	--drive-password: the drive password for the parent drive of the folder identified by --folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-key
	--drive-key: the drive key for the parent drive of the folder identified by --folder-id
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-password
	--file-key: the file key of the file
	• Required only for files residing in private drives
	• Can NOT be used in conjunction with --drive-password or --drive-key


General Options:
--wallet-file: the path to a JWK file on the file system
	• Can't be used with --seed-phrase
--seed-phrase: a 12-word seed phrase representing a JWK
	• Can't be used with --wallet-file
--gateway:
	• The base URL for your preferred Arweave gateway, e.g. "https://arweave.net"
--no-wait: don't wait for transactions to complete before program termination
--wait: wait and poll on status of mining operations until mining for all transactions have completed (success OR fail)
	• active by default
	• Can NOT be used in conjunction with --no-wait
--approve-fees: accept all potential fees for transactions without prompting
--fee-threshold: abort all transactions if total fees, in Winston, will exceed this value
--dry-run: Print the sequence of actions that would be taken, and their potential fees, without sending transactions
--log-level: modifies the volume of logging provided. Options:
	• verbose
	• error
	• warning
	• debug - firehose of info
	• quiet - just return json and status code
	• silent - just return status code
	`);
}

if (require.main === module) {
	CLICommand.parse();
}
