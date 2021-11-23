import { EID } from 'ardrive-core-js';
import { resolve } from 'path';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FolderIdParameter,
	LocalFilePathParameter,
	MaxDepthParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		MaxDepthParameter,
		{ name: DriveIdParameter, required: false },
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolve);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			await ardrive.downloadPrivateFolder(folderId, maxDepth, localFilePath, driveKey);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFolder(folderId, maxDepth, localFilePath);
		}
		console.log(`Folder with ID "${folderId}" was successfully download to "${localFilePath}"`);
	})
});
