import { Parameter } from './CLICommand/parameter';

export const WalletFileParameter = 'walletFile';
export const SeedPhraseParameter = 'seedPhrase';
export const DrivePasswordParameter = 'drivePassword';
export const DriveNameParameter = 'driveName';
export const DriveKeyParameter = 'driveKey';
export const DriveAddressParameter = 'driveAddress';
export const DriveIdParameter = 'driveId';
export const ArAmountParameter = 'arAmount';
export const DestinationAddressParameter = 'destAddres';
export const TransactionIdParameter = 'txId';
export const ConfirmationsParameter = 'confirmations';
export const FolderIdParameter = 'folderId';
export const ParentFolderIdParameter = 'parentFolderId';
export const LocalFilePathParameter = 'localFilePath';
export const DestinationFileNameParameter = 'destFileName';
export const LocalFilesParameter = 'localFiles';
export const GetAllRevisionsParameter = 'getAllRevisions';
export const BoostParameter = 'boost';
export const DryRunParameter = 'dryRun';

/**
 * Note: importing this file will declare all the above parameters
 */

Parameter.declare({
	name: WalletFileParameter,
	aliases: ['-w', '--wallet-file'],
	description: `the path to a JWK file on the file system
		• Can't be used with --seed-phrase`,
	forbiddenConjunctionParameters: [SeedPhraseParameter]
});

Parameter.declare({
	name: SeedPhraseParameter,
	aliases: ['-s', '--seed-phrase'],
	description: `a 12-word seed phrase representing a JWK
		• Can't be used with --wallet-file`,
	forbiddenConjunctionParameters: [WalletFileParameter]
});

Parameter.declare({
	name: DrivePasswordParameter,
	aliases: ['-p', '--drive-password'],
	description: `the encryption password for the private drive (OPTIONAL)
		• When provided, creates the drive as a private drive. Public drive otherwise.`,
	forbiddenConjunctionParameters: [DriveKeyParameter, DriveAddressParameter]
});

Parameter.declare({
	name: DriveKeyParameter,
	aliases: ['-k', '--drive-key'],
	description: `the drive key for the parent drive of the folder identified by --folder-id
		• Required only for folders residing in private drives
		• Can NOT be used in conjunction with --drive-password`,
	forbiddenConjunctionParameters: [DrivePasswordParameter, DriveAddressParameter]
});

Parameter.declare({
	name: DriveNameParameter,
	aliases: ['-n', '--drive-name'],
	description: `the name for the new drive`
});

Parameter.declare({
	name: DriveAddressParameter,
	aliases: ['-a', '--drive-address'],
	description: 'the address',
	forbiddenConjunctionParameters: [DrivePasswordParameter, DriveKeyParameter]
});

Parameter.declare({
	name: DriveIdParameter,
	aliases: ['-d', '--drive-id'],
	description: 'the drive ID to get metadata from',
	required: true
});

Parameter.declare({
	name: ArAmountParameter,
	aliases: ['-a', '--ar-amount'],
	description: 'required: amount of AR to send',
	required: true
});

Parameter.declare({
	name: DestinationAddressParameter,
	aliases: ['-d', '--dest-address'],
	description: 'required: destination wallet address',
	required: true
});

Parameter.declare({
	name: TransactionIdParameter,
	aliases: ['-t', '--tx-id'],
	description: 'The transaction id to check the status of in the mempool',
	required: true
});

Parameter.declare({
	name: ConfirmationsParameter,
	aliases: ['-c', '--confirmations'],
	description: 'Number of confirmations to determine if a transaction is mined'
});

Parameter.declare({
	name: ParentFolderIdParameter,
	aliases: ['-f', '--parent-folder-id'],
	description: `the ArFS folder ID for the folder in which this file will reside (i.e. its parent folder)
		• To upload the file to the root of a drive, use the root folder ID of the drive`,
	required: true
});

Parameter.declare({
	name: FolderIdParameter,
	aliases: ['-f', '--folder-id'],
	description: `the ArFS folder ID for the folder to query`,
	required: true
});

Parameter.declare({
	name: LocalFilePathParameter,
	aliases: ['-l', '--local-file-path'],
	description: `the path on the local filesystem for the file that will be uploaded`
});

Parameter.declare({
	name: DestinationFileNameParameter,
	aliases: ['-d', '--dest-file-name'],
	description: `(OPTIONAL) a destination file name to use when uploaded to ArDrive`
});

Parameter.declare({
	name: LocalFilesParameter,
	aliases: ['--local-files'],
	description: `a path to a csv (tab delimited) file containing rows of data for the following columns:
		• CSV Columns
		• local file path
		• destination file name (optional)
		• parent folder ID (optional)
			• --parent-folder-id used, otherwise
			• all parent folder IDs should reside in the same drive
		• Can NOT be used in conjunction with --local-file-path`
});

Parameter.declare({
	name: GetAllRevisionsParameter,
	aliases: ['--get-all-revisions'],
	description: '(OPTIONAL) gets every revision',
	type: 'boolean'
});

Parameter.declare({
	name: BoostParameter,
	aliases: ['--boost'],
	description:
		'(OPTIONAL) a multiple of the base transaction data fee that can be used to accelerate transaction mining. A multiple of 2.5 would boost a 100 Winston transaction fee to 250 Winston.'
});

Parameter.declare({
	name: DryRunParameter,
	aliases: ['--dry-run'],
	description:
		'(OPTIONAL) Print the results of the transactions that would occur, and their potential fees, without sending the transactions.',
	type: 'boolean'
});
