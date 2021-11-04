import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FolderIdParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { Wallet } from '../wallet';
import { arDriveFactory } from '..';
import { FeeMultiple } from '../types';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';

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

		const { parentFolderId: newParentFolderId, boost, dryRun } = options;

		const folderId = parameters.getRequiredParameterValue(FolderIdParameter);

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: boost as FeeMultiple,
			dryRun: dryRun
		});

		const moveFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey({ driveId });

				return ardrive.movePrivateFolder({ folderId, newParentFolderId, driveKey });
			} else {
				return ardrive.movePublicFolder({ folderId, newParentFolderId });
			}
		})();

		console.log(JSON.stringify(moveFolderResult, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
