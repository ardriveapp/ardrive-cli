import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	BoostParameter,
	DrivePasswordParameter,
	DryRunParameter,
	FileIdParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';
import { arDriveFactory, cliWalletDao } from '..';
import { FeeMultiple } from '../types';

/* eslint-disable no-console */

new CLICommand({
	name: 'move-file',
	parameters: [
		WalletFileParameter,
		SeedPhraseParameter,
		FileIdParameter,
		ParentFolderIdParameter,
		DrivePasswordParameter,
		BoostParameter,
		DryRunParameter
	],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet: Wallet = await context.getWallet();

		const { fileId, parentFolderId, drivePassword, boost, dryRun } = options;

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: boost as FeeMultiple,
			dryRun: dryRun
		});

		const createDriveResult = await (async function () {
			if (await context.getIsPrivate()) {
				return ardrive.movePublicFile(fileId, parentFolderId);
			} else {
				return ardrive.movePrivateFile(fileId, parentFolderId, drivePassword);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		process.exit(0);
	}
});
