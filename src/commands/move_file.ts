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

		const { fileId, parentFolderId, boost, dryRun } = options;

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: boost as FeeMultiple,
			dryRun: dryRun
		});

		const createDriveResult = await (async function () {
			if (await context.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(parentFolderId);
				const driveKey = await context.getDriveKey(driveId);

				return ardrive.movePrivateFile(fileId, parentFolderId, driveKey);
			} else {
				return ardrive.movePublicFile(fileId, parentFolderId);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		process.exit(0);
	}
});
