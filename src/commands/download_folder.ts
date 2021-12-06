import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, FolderIdParameter, DestinationFolderPathParameter } from '../parameter_declarations';

new CLICommand({
	name: 'download-folder',
	parameters: [FolderIdParameter, DestinationFolderPathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const destFolderPath = parameters.getParameterValue(DestinationFolderPathParameter) || './';
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveId = await ardrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey({ driveId: driveId });
			await ardrive.downloadPrivateFolder({ folderId, destFolderPath, maxDepth, driveKey });
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFolder({ folderId, destFolderPath, maxDepth });
		}
		console.log(`Folder with ID "${folderId}" was successfully download to "${destFolderPath}"`);
	})
});
