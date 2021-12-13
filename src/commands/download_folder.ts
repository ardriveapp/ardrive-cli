import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DrivePrivacyParameters,
	FolderIdParameter,
	LocalPathParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { getOutputFolderPathAndName } from '../utils/local_folder_path';

new CLICommand({
	name: 'download-folder',
	parameters: [FolderIdParameter, LocalPathParameter, MaxDepthParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const outputFolderPath = parameters.getParameterValue(LocalPathParameter) || './';
		const [destFolderPath, customFolderName] = getOutputFolderPathAndName(outputFolderPath);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveId = await ardrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey({ driveId: driveId });
			await ardrive.downloadPrivateFolder({ folderId, destFolderPath, customFolderName, maxDepth, driveKey });
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFolder({ folderId, destFolderPath, customFolderName, maxDepth });
		}
		console.log(`Folder with ID "${folderId}" was successfully download to "${destFolderPath}"`);
	})
});
