import {
	ArFSPrivateFileBuilder,
	deriveFileKey,
	DriveID,
	EID,
	VersionedDriveKey,
	GatewayAPI,
	gatewayUrlForArweave,
	DriveSignatureType
} from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveCreationPrivacyParameters,
	DriveIdParameter,
	DriveKeyParameter,
	FileIdParameter,
	GatewayParameter,
	NoVerifyParameter
} from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';

new CLICommand({
	name: 'get-file-key',
	parameters: [
		...DriveCreationPrivacyParameters,
		DriveIdParameter,
		DriveKeyParameter,
		FileIdParameter,
		NoVerifyParameter,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const fileId = EID(parameters.getRequiredParameterValue(FileIdParameter));

		// Obviate the need for a drive ID when a drive key is specified
		const [driveKey, owner] = await (async () => {
			const driveKeyParam = parameters.getParameterValue(DriveKeyParameter);
			const arweave = getArweaveFromURL(parameters.getGateway());

			if (driveKeyParam) {
				const arDrive = cliArDriveAnonymousFactory({ arweave });
				const owner = await arDrive.getOwnerForFileId(fileId);
				return [new VersionedDriveKey(Buffer.from(driveKeyParam, 'base64'), DriveSignatureType.v1), owner];
			}

			// Lean on getDriveKey with a specified driveID
			// TODO: In the future, loosen driveID requirement and fetch from fileID
			const driveId: DriveID = EID(parameters.getRequiredParameterValue(DriveIdParameter));
			const wallet = await parameters.getRequiredWallet();
			const owner = await wallet.getAllAddresses();
			const arDrive = cliArDriveFactory({ wallet, arweave });

			const driveKey = await parameters.getDriveKey({
				driveId,
				arDrive,
				owner
			});
			return [driveKey, owner];
		})();

		const fileKey = await deriveFileKey(`${fileId}`, driveKey);
		if (options.verify) {
			const arweave = getArweaveFromURL(parameters.getGateway());
			const file = await new ArFSPrivateFileBuilder(
				fileId,
				new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(arweave) }),
				driveKey,
				Object.values(owner),
				fileKey
			).build();
			console.log(file.fileKey.toJSON());
		} else {
			console.log(fileKey.toJSON());
		}
	})
});
