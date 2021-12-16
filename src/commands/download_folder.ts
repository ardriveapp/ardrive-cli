import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DrivePrivacyParameters,
	FolderIdParameter,
	LocalFilePathDownloadParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { getOutputFolderPathAndName } from '../utils';
import { join as joinPath } from 'path';

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		{
			name: LocalFilePathDownloadParameter,
			description:
				'(OPTIONAL) the path on the local filesystem where the folder should be downloaded. Defaults to current working directory'
		},
		MaxDepthParameter,
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destOutputPath = parameters.getParameterValue(LocalFilePathDownloadParameter) || '.';
		const [destFolderPath, customFolderName] = getOutputFolderPathAndName(destOutputPath);
		let outputPath: string;

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveId = await ardrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey({ driveId: driveId });
			await ardrive.downloadPrivateFolder({
				folderId,
				driveKey,
				destFolderPath,
				customFolderName,
				maxDepth
			});
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPrivateFolder({ folderId, driveKey })).name
			);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFolder({ folderId, destFolderPath, customFolderName, maxDepth });
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPublicFolder({ folderId })).name
			);
		}
		console.log(`Folder with ID "${folderId}" was successfully downloaded to "${outputPath}"`);
	})
});
