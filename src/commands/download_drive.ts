import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DrivePrivacyParameters,
	DriveIdParameter,
	LocalPathParameter,
	MaxDepthParameter,
	GatewayParameter
} from '../parameter_declarations';
import { getOutputFolderPathAndName } from '../utils';
import { join as joinPath } from 'path';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'download-drive',
	parameters: [
		DriveIdParameter,
		{
			name: LocalPathParameter,
			description:
				'(OPTIONAL) the path on the local filesystem where the folder should be created and into which the contents of the drive are then downloaded. By default, the folder is created in the current working directory.'
		},
		MaxDepthParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destOutputPath = parameters.getParameterValue(LocalPathParameter) || '.';
		const [destFolderPath, customFolderName] = getOutputFolderPathAndName(destOutputPath);
		let outputPath: string;
		const gateway = parameters.getGateway();
		const arweave = getArweaveFromURL(gateway);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				arweave
			});

			const driveKey = await parameters.getDriveKey({
				driveId,
				arDrive: ardrive,
				owner: await wallet.getOwner()
			});
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
			const ardrive = cliArDriveAnonymousFactory({ arweave });
			await ardrive.downloadPublicDrive({ driveId, destFolderPath, customFolderName, maxDepth });
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPublicDrive({ driveId })).name
			);
		}
		console.log(`Drive with ID "${driveId}" was successfully downloaded to "${outputPath}"`);
	})
});
