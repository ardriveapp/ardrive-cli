import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	FolderNameParameter,
	DrivePasswordParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory } from '..';
import { Wallet } from '../wallet_new';
import { FeeMultiple } from '../types';

/* eslint-disable no-console */

new CLICommand({
	name: 'create-folder',
	parameters: [
		WalletFileParameter,
		SeedPhraseParameter,
		ParentFolderIdParameter,
		FolderNameParameter,
		DrivePasswordParameter,
		BoostParameter,
		DryRunParameter
	],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: options.boost as FeeMultiple,
			dryRun: options.dryRun
		});

		const createFolderResult = await (async function () {
			const driveId = await ardrive.getDriveIdForFolderId(options.parentFolderId);

			if (await parameters.getIsPrivate()) {
				const driveKey = await parameters.getDriveKey(driveId);
				return ardrive.createPrivateFolder(options.folderName, driveId, driveKey);
			} else {
				return ardrive.createPublicFolder(options.folderName, driveId);
			}
		})();
		console.log(JSON.stringify(createFolderResult, null, 4));

		process.exit(0);
	}
});
