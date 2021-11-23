import { EID } from 'ardrive-core-js';
import { resolve } from 'path';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	LocalFilePathParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { cliArDriveFactory, cliArDriveAnonymousFactory } from '..';

new CLICommand({
	name: 'download-drive',
	parameters: [
		DriveIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		MaxDepthParameter,
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolve);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			const drive = await ardrive.getPrivateDrive({ driveId, driveKey });
			await ardrive.downloadPrivateFolder(drive.rootFolderId, maxDepth, localFilePath, driveKey);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			const drive = await ardrive.getPublicDrive({ driveId });
			await ardrive.downloadPublicFolder(drive.rootFolderId, maxDepth, localFilePath);
		}
		console.log(`Drive with ID "${driveId}" was successfully download to "${localFilePath}"`);
	})
});
