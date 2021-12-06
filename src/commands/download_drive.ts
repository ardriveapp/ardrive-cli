import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, DestinationFolderPathParameter, DriveIdParameter } from '../parameter_declarations';

new CLICommand({
	name: 'download-drive',
	parameters: [DriveIdParameter, DestinationFolderPathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const destFolderPath = parameters.getParameterValue(DestinationFolderPathParameter) || './';
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveKey = await parameters.getDriveKey({ driveId });
			await ardrive.downloadPrivateDrive({ driveId, destFolderPath, maxDepth, driveKey });
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicDrive({ driveId, destFolderPath, maxDepth });
		}
		console.log(`Drive with ID "${driveId}" was successfully download to "${destFolderPath}"`);
	})
});
