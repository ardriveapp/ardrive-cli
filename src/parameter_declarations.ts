import { Parameter } from './CLICommand/parameter';

export const WalletFileParameter = 'walletFile';
export const SeedPhraseParameter = 'seedPhrase';
export const DrivePasswordParameter = 'drivePassword';
export const DriveNameParameter = 'driveName';
export const DriveKeyParameter = 'driveKey';
export const DriveAddressParameter = 'driveAddress';

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
	aliases: ['-a', '-drive-address'],
	description: 'the address',
	forbiddenConjunctionParameters: [DrivePasswordParameter, DriveKeyParameter]
});
