import { CLICommand, ParametersHelper } from '../CLICommand';
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
import { arDriveFactory } from '..';
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
		const parameters = new ParametersHelper(options);

		const { fileId, parentFolderId, boost, dryRun } = options;

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: boost as FeeMultiple,
			dryRun: dryRun
		});

		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(parentFolderId);
				const driveKey = await parameters.getDriveKey(driveId);

				return ardrive.movePrivateFile(fileId, parentFolderId, driveKey);
			} else {
				return ardrive.movePublicFile(fileId, parentFolderId);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		process.exit(0);
	}
});
