import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	FolderNameParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { arDriveFactory } from '..';
import { Wallet } from '../wallet_new';
import { FeeMultiple } from '../types';

/* eslint-disable no-console */

new CLICommand({
	name: 'create-folder',
	parameters: [
		ParentFolderIdParameter,
		FolderNameParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters
	],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: options.boost as FeeMultiple,
			dryRun: options.dryRun
		});

		const parentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter);
		const driveId = await ardrive.getDriveIdForFolderId(options.parentFolderId);

		const createFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveKey = await parameters.getDriveKey(driveId);
				return ardrive.createPrivateFolder(options.folderName, driveId, driveKey, parentFolderId);
			} else {
				return ardrive.createPublicFolder(options.folderName, driveId, parentFolderId);
			}
		})();
		console.log(JSON.stringify(createFolderResult, null, 4));

		process.exit(0);
	}
});
