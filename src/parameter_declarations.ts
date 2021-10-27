import { Parameter } from './CLICommand/parameter';

export const WalletFileParameter = 'walletFile';
export const SeedPhraseParameter = 'seedPhrase';
export const PrivateParameter = 'private';
export const UnsafeDrivePasswordParameter = 'unsafeDrivePassword';
export const DriveNameParameter = 'driveName';
export const FolderNameParameter = 'folderName';
export const DriveKeyParameter = 'driveKey';
export const AddressParameter = 'address';
export const DriveIdParameter = 'driveId';
export const ArAmountParameter = 'arAmount';
export const DestinationAddressParameter = 'destAddress';
export const TransactionIdParameter = 'txId';
export const ConfirmationsParameter = 'confirmations';
export const FolderIdParameter = 'folderId';
export const FileIdParameter = 'fileId';
export const ParentFolderIdParameter = 'parentFolderId';
export const LocalFilePathParameter = 'localFilePath';
export const DestinationFileNameParameter = 'destFileName';
export const LocalFilesParameter = 'localFiles';
export const GetAllRevisionsParameter = 'getAllRevisions';
export const AllParameter = 'all';
export const MaxDepthParameter = 'maxDepth';
export const BoostParameter = 'boost';
export const DryRunParameter = 'dryRun';
export const NoVerifyParameter = 'verify'; // commander maps --no-x style params to options.x and always includes in options

// Aggregates for convenience
export const DriveCreationPrivacyParameters = [
	PrivateParameter,
	UnsafeDrivePasswordParameter,
	WalletFileParameter,
	SeedPhraseParameter
];
export const DrivePrivacyParameters = [DriveKeyParameter, ...DriveCreationPrivacyParameters];
export const TreeDepthParams = [AllParameter, MaxDepthParameter];

/**
 * Note: importing this file will declare all the above parameters
 */

Parameter.declare({
	name: WalletFileParameter,
	aliases: ['-w', '--wallet-file'],
	description: `the path to a JWK file on the file system representing your Arweave wallet
\t\t\t\t\t\t\t• Can't be used with --seed-phrase`,
	forbiddenConjunctionParameters: [SeedPhraseParameter]
});

Parameter.declare({
	name: SeedPhraseParameter,
	aliases: ['-s', '--seed-phrase'],
	description: `a 12-word seed phrase representing a JWK
\t\t\t\t\t\t\t• Can't be used with --wallet-file`,
	forbiddenConjunctionParameters: [WalletFileParameter]
});

Parameter.declare({
	name: UnsafeDrivePasswordParameter,
	aliases: ['-p', '--unsafe-drive-password'],
	description: `(OPTIONAL - NOT RECOMMENDED) the encryption password for the private drive
\t\t\t\t\t\t\t• When provided, creates/accesses a private drive. Public drive otherwise.
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --private
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --drive-key`,
	forbiddenConjunctionParameters: [DriveKeyParameter, PrivateParameter]
});

Parameter.declare({
	name: PrivateParameter,
	aliases: ['-P', '--private'],
	description: `(OPTIONAL - RECOMMENDED OVER --unsafe-drive-password) specify to create/interact with private entities, i.e. drives, folders, and files
\t\t\t\t\t\t\t• obtains the drive password from the following locations, in precedence order:
\t\t\t\t\t\t\t\t- STDIN
\t\t\t\t\t\t\t\t- Environment variable ARDRIVE_DRIVE_PW
\t\t\t\t\t\t\t\t- Interactive, secure prompt
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --unsafe-drive-password
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --drive-key`,
	forbiddenConjunctionParameters: [DriveKeyParameter, UnsafeDrivePasswordParameter],
	type: 'boolean'
});

Parameter.declare({
	name: DriveKeyParameter,
	aliases: ['-k', '--drive-key'],
	description: `the base64 encoded symmetric encryption key (with '=' characters excised) for the drive (or parent drive in the case of folder operations)
\t\t\t\t\t\t\t• Required only for operations involving private drives or entities within them
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --unsafe-drive-password
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --private`,
	forbiddenConjunctionParameters: [UnsafeDrivePasswordParameter, PrivateParameter]
});

Parameter.declare({
	name: DriveNameParameter,
	aliases: ['-n', '--drive-name'],
	description: `the name for the new drive`,
	required: true
});

Parameter.declare({
	name: FolderNameParameter,
	aliases: ['-n', '--folder-name'],
	description: `the name for the new folder`,
	required: true
});

Parameter.declare({
	name: AddressParameter,
	aliases: ['-a', '--address'],
	description: 'the 43-character Arweave wallet address to use for lookups'
});

Parameter.declare({
	name: DriveIdParameter,
	aliases: ['-d', '--drive-id'],
	description: 'the ArFS entity ID associated with the target drive',
	required: true
});

Parameter.declare({
	name: ArAmountParameter,
	aliases: ['-a', '--ar-amount'],
	description: `amount of AR to send to the --dest-address
\t\t\t\t\t\t\t• does NOT include transaction mining base rewards`,
	required: true
});

Parameter.declare({
	name: DestinationAddressParameter,
	aliases: ['-d', '--dest-address'],
	description: 'the 43-character Arweave wallet address to which AR should be sent',
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
	aliases: ['-F', '--parent-folder-id'],
	description: `the ArFS folder ID for the folder in which this file will reside (i.e. its parent folder)
\t\t\t\t\t\t\t• To upload the file to the root of a drive, use the root folder ID of the drive`,
	required: true
});

Parameter.declare({
	name: FolderIdParameter,
	aliases: ['-f', '--folder-id'],
	description: `the ArFS folder ID for the folder to query`,
	required: true
});

Parameter.declare({
	name: FileIdParameter,
	aliases: ['-f', '--file-id'],
	description: `the ArFS file ID for the file to query`,
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
	description: `(BETA) a path to a csv (tab delimited) file containing rows of data for the following columns:
\t\t\t\t\t\t\t• CSV Columns:
\t\t\t\t\t\t\t\t• local file path
\t\t\t\t\t\t\t\t• destination file name (optional)
\t\t\t\t\t\t\t\t• parent folder ID (optional)
\t\t\t\t\t\t\t\t\t• --parent-folder-id used, otherwise
\t\t\t\t\t\t\t• all parent folder IDs should reside in the same drive
\t\t\t\t\t\t\t• Can NOT be used in conjunction with --local-file-path`,
	forbiddenConjunctionParameters: [LocalFilePathParameter]
});

Parameter.declare({
	name: GetAllRevisionsParameter,
	aliases: ['--get-all-revisions'],
	description: '(OPTIONAL) gets every revision of the entity',
	type: 'boolean'
});

Parameter.declare({
	name: BoostParameter,
	aliases: ['--boost'],
	description:
		'(OPTIONAL) a multiple of the base transaction mining reward that can be used to accelerate transaction mining. A multiple of 2.5 would boost a 100 Winston transaction reward to 250 Winston.'
});

Parameter.declare({
	name: DryRunParameter,
	aliases: ['--dry-run'],
	description:
		'(OPTIONAL) Print the results of the transactions that would occur, and their potential tips and mining rewards, without sending the transactions.',
	type: 'boolean'
});

Parameter.declare({
	name: AllParameter,
	aliases: ['--all'],
	description: `(OPTIONAL) gets all contents within this folder, including child files/folders`,
	type: 'boolean',
	forbiddenConjunctionParameters: [MaxDepthParameter]
});

Parameter.declare({
	name: MaxDepthParameter,
	aliases: ['--max-depth'],
	description: `(OPTIONAL) a non-negative integer value indicating the depth of the folder tree to list. 0 = specified folder's contents OR root folder for drives`
});

Parameter.declare({
	name: NoVerifyParameter,
	aliases: ['--no-verify'],
	description:
		'(OPTIONAL) Derives a drive key for the given drive ID without verifying its correctness against the drive on chain.',
	type: 'boolean'
});
