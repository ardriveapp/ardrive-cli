import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, DriveIdParameter, DownloadLocalPathParameter } from '../parameter_declarations';
import { getOutputFolderPathAndName } from '../utils';
import { join as joinPath } from 'path';

new CLICommand({
	name: 'download-drive',
	parameters: [DriveIdParameter, DownloadLocalPathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destOutputPath = parameters.getParameterValue(DownloadLocalPathParameter) || '.';
		const [destFolderPath, customFolderName] = getOutputFolderPathAndName(destOutputPath);
		let outputPath: string;

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveKey = await parameters.getDriveKey({ driveId });
			await ardrive.downloadPrivateDrive({
				driveId,
				driveKey,
				destFolderPath,
				customFolderName,
				maxDepth
			});
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPrivateDrive({ driveId, driveKey })).name
			);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicDrive({ driveId, destFolderPath, customFolderName, maxDepth });
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPublicDrive({ driveId })).name
			);
		}
		console.log(`Drive with ID "${driveId}" was successfully downloaded to "${outputPath}"`);
	})
});
