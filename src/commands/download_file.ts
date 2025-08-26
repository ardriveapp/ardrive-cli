import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DrivePrivacyParameters,
	FileIdParameter,
	GatewayParameter,
	LocalPathParameter
} from '../parameter_declarations';
import { getOutputFilePathAndName } from '../utils';
import { join } from 'path';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'download-file',
	parameters: [
		FileIdParameter,
		{
			name: LocalPathParameter,
			description:
				'(OPTIONAL) the path on the local filesystem where the file should be downloaded. Defaults to current working directory.'
		},
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const destOutputPath = parameters.getParameterValue(LocalPathParameter) || '.';
		const arweave = getArweaveFromURL(parameters.getGateway());

		const [destFolderPath, defaultFileName] = getOutputFilePathAndName(destOutputPath);
		let outputPath: string;

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				arweave
			});
			const driveId = await ardrive.getDriveIdForFileId(fileId);
			const driveKey = await parameters.getDriveKey({
				driveId,
				arDrive: ardrive,
				owner: await wallet.getAllAddresses()
			});
			await ardrive.downloadPrivateFile({ fileId, driveKey, destFolderPath, defaultFileName });
			outputPath = join(
				destFolderPath,
				defaultFileName ? defaultFileName : (await ardrive.getPrivateFile({ fileId, driveKey })).name
			);
		} else {
			const ardrive = cliArDriveAnonymousFactory({ arweave });
			await ardrive.downloadPublicFile({ fileId, destFolderPath, defaultFileName });
			outputPath = join(
				destFolderPath,
				defaultFileName ? defaultFileName : (await ardrive.getPublicFile({ fileId })).name
			);
		}
		console.log(`File with ID "${fileId}" was successfully downloaded to "${outputPath}"`);
	})
});
