import { EID } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '../index';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DrivePrivacyParameters,
	FolderIdParameter,
	GatewayParameter,
	LocalPathParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { getOutputFolderPathAndName } from '../utils';
import { join as joinPath } from 'path';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		{
			name: LocalPathParameter,
			description:
				'(OPTIONAL) the path on the local filesystem where the folder should be created and into which its contents are then downloaded. By default, the folder is created in the current working directory.'
		},
		MaxDepthParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destOutputPath = parameters.getParameterValue(LocalPathParameter) || '.';
		const [destFolderPath, customFolderName] = getOutputFolderPathAndName(destOutputPath);
		let outputPath: string;
		const arweave = getArweaveFromURL(parameters.getGateway());

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = cliArDriveFactory({
				wallet,
				arweave
			});
			const driveId = await arDrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey({
				driveId,
				arDrive: arDrive,
				walletAddress: await wallet.getAddress()
			});
			await arDrive.downloadPrivateFolder({
				folderId,
				driveKey,
				destFolderPath,
				customFolderName,
				maxDepth
			});
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await arDrive.getPrivateFolder({ folderId, driveKey })).name
			);
		} else {
			const ardrive = cliArDriveAnonymousFactory({ arweave });
			await ardrive.downloadPublicFolder({ folderId, destFolderPath, customFolderName, maxDepth });
			outputPath = joinPath(
				destFolderPath,
				customFolderName ? customFolderName : (await ardrive.getPublicFolder({ folderId })).name
			);
		}
		console.log(`Folder with ID "${folderId}" was successfully downloaded to "${outputPath}"`);
	})
});
