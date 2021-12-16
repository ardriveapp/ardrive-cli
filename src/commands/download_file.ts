import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, FileIdParameter, LocalPathParameter } from '../parameter_declarations';
import { getOutputFilePathAndName } from '../utils';

new CLICommand({
	name: 'download-file',
	parameters: [FileIdParameter, LocalPathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const destOutputPath = parameters.getParameterValue(LocalPathParameter) || './';

		const [destFolderPath, defaultFileName] = getOutputFilePathAndName(destOutputPath);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveId = await ardrive.getDriveIdForFileId(fileId);
			const driveKey = await parameters.getDriveKey({ driveId: driveId });
			await ardrive.downloadPrivateFile({ fileId, driveKey, destFolderPath, defaultFileName });
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFile({ fileId, destFolderPath, defaultFileName });
		}
		console.log(`File with ID "${fileId}" was successfully download to "${destOutputPath}"`);
	})
});
