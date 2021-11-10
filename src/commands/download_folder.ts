import { resolve } from 'path';
import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	AllParameter,
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FolderIdParameter,
	LocalFilePathParameter
} from '../parameter_declarations';
import { EID } from '../types';

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		AllParameter,
		{ name: DriveIdParameter, required: false },
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolve);
		const maxDepth = await parameters.getMaxDepth();

		if (await parameters.getIsPrivate()) {
			const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = arDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			await ardrive.downloadPrivateFolder(folderId, maxDepth, localFilePath, driveKey);
		} else {
			const ardrive = arDriveAnonymousFactory();
			await ardrive.downloadPublicFolder(folderId, maxDepth, localFilePath);
		}
		console.log(`Folder with ID "${folderId}" was successfully download to "${localFilePath}"`);
	})
});
