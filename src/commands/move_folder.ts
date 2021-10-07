import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FolderIdParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';
import { arDriveFactory } from '..';
import { FeeMultiple } from '../types';

/* eslint-disable no-console */

new CLICommand({
	name: 'move-folder',
	parameters: [
		FolderIdParameter,
		ParentFolderIdParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters
	],
	async action(options) {
		const parameters = new ParametersHelper(options);

		const { folderId, parentFolderId, boost, dryRun } = options;

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: boost as FeeMultiple,
			dryRun: dryRun
		});

		const moveFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey(driveId);

				return ardrive.movePrivateFolder(folderId, parentFolderId, driveKey);
			} else {
				return ardrive.movePublicFolder(folderId, parentFolderId);
			}
		})();

		console.log(JSON.stringify(moveFolderResult, null, 4));

		process.exit(0);
	}
});
