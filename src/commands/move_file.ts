import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';
import { arDriveFactory } from '..';
import { FeeMultiple } from '../types';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

new CLICommand({
	name: 'move-file',
	parameters: [FileIdParameter, ParentFolderIdParameter, BoostParameter, DryRunParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
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
				const driveKey = await parameters.getDriveKey({ driveId });

				return ardrive.movePrivateFile(fileId, parentFolderId, driveKey);
			} else {
				return ardrive.movePublicFile(fileId, parentFolderId);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
