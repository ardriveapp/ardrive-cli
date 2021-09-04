#!/usr/bin/env node

//import * as ardrive from 'ardrive-core-js';
import { Command } from 'commander';
import * as fs from 'fs';
import { ArDrive } from './ardrive';
import { ArFSDAO } from './arfsdao';
import { JWKInterface } from 'ardrive-core-js';
import { Wallet, JWKWallet } from './wallet_new';
import Arweave from 'arweave';

/* eslint-disable no-console */

// Utility for parsing command line options
const program = new Command();

// Set up command line option parsing
//const validActions = ['create-drive', 'rename-drive', 'upload-file'];
program.option('-h, --help', 'Get help');
//program.option('create-drive', 'action to create a new drive (and its corresponding root folder)');
program.addHelpCommand(false);

program
	.command('create-drive')
	.option(
		'-w, --wallet-file [path_to_jwk_file]',
		`the path to a JWK file on the file system
	• Can't be used with --seed-phrase`
	)
	.option(
		'-s, --seed-phrase [12-word seed phrase]',
		`a 12-word seed phrase representing a JWK
		• Can't be used with --wallet-file`
	)
	.option('-n, --drive-name [name]', `the name for the new drive`)
	.action((options) => {
		// Enforce -w OR -s but not both
		if (
			(options.walletFile != null && options.seedPhrase != null) ||
			(options.walletFile == null && options.seedPhrase == null)
		) {
			console.log('Choose --wallet-file OR --seed-phrase, but not both.');
			process.exit(1);
		}

		// TODO: REMOVE
		if (options.walletFile != null) {
			console.log(`Wallet file lives at ${options.walletFile}`);
		}

		if (options.seedPhrase != null) {
			console.log(`Seed phrase is ${options.seedPhrase}`);
		}

		// TODO: GET WALLET DATA
		// TODO: Export convert seed phrase to wallet

		const walletFileData = fs.readFileSync(options.walletFile, { encoding: 'utf8', flag: 'r' });
		const walletJSON = JSON.parse(walletFileData);
		const walletJWK = walletJSON as JWKInterface;
		const wallet: Wallet = new JWKWallet(walletJWK);
		const arweave = Arweave.init({
			host: 'arweave.net', // Arweave Gateway
			//host: 'arweave.dev', // Arweave Dev Gateway
			port: 443,
			protocol: 'https',
			timeout: 600000
		});
		const ardrive = new ArDrive(new ArFSDAO(wallet, arweave));
		ardrive.createPublicDrive(options.driveName);

		/* STEPS:
			• Generate a drive ID (auto gen)
			• Create a drive key (drive ID + wallet privkey)
			• Create a drive metadata TX
			• Create a root folder metadata TX
			• EVENTUALLY - Create community tip TX
		*/
		/*try {
  if (fs.existsSync(path)) {
    //file exists
  }
} catch(err) {
  console.error(err)
}*/

		process.exit(0);
	});

program
	.command('get-balance')
	.option(
		'-w, --wallet-file [path_to_jwk_file]',
		`the path to a JWK file on the file system
			• Can't be used with --seed-phrase`
	)
	.action(async (options) => {
		if (options.walletFile != null) {
			console.log(`Wallet file lives at ${options.walletFile}`);
		} else {
			console.log('MISSING WALLET FILE!');
			process.exit(1);
		}

		const walletFileData = fs.readFileSync(options.walletFile, { encoding: 'utf8', flag: 'r' });
		const walletJSON = JSON.parse(walletFileData);
		const walletJWK = walletJSON as JWKInterface;
		const wallet = new JWKWallet(walletJWK);
		console.log(await wallet.getAddress());
		process.exit(0);
	});

program.parse(process.argv);

// Process command line inputs
const opts = program.opts();
console.log(`opts: ${Object.getOwnPropertyNames(opts)}`);
console.log(`commands: ${program.commands}`);
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
	--folder-name: (OPTIONAL) a destination file name to use when uploaded to ArDrive
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

