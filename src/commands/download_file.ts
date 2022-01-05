import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, FileIdParameter, LocalPathParameter } from '../parameter_declarations';
import { getOutputFilePathAndName } from '../utils';
import { join } from 'path';

new CLICommand({
	name: 'download-file',
	parameters: [FileIdParameter, LocalPathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const destOutputPath = parameters.getParameterValue(LocalPathParameter) || '.';

		const [destFolderPath, defaultFileName] = getOutputFilePathAndName(destOutputPath);
		let outputPath: string;

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting()
			});
			const driveId = await ardrive.getDriveIdForFileId(fileId);
			const driveKey = await parameters.getDriveKey({ driveId: driveId });
			await ardrive.downloadPrivateFile({ fileId, driveKey, destFolderPath, defaultFileName });
			outputPath = join(
				destFolderPath,
				defaultFileName ? defaultFileName : (await ardrive.getPrivateFile({ fileId, driveKey })).name
			);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			await ardrive.downloadPublicFile({ fileId, destFolderPath, defaultFileName });
			outputPath = join(
				destFolderPath,
				defaultFileName ? defaultFileName : (await ardrive.getPublicFile({ fileId })).name
			);
		}
		console.log(`File with ID "${fileId}" was successfully downloaded to "${outputPath}"`);
	})
});
