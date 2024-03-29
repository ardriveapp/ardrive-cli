import {
	ArFSPrivateFileBuilder,
	deriveFileKey,
	DriveID,
	EID,
	EntityKey,
	GatewayAPI,
	gatewayUrlForArweave
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
		const driveKey = await (async () => {
			const driveKeyParam = parameters.getParameterValue(DriveKeyParameter);
			if (driveKeyParam) {
				return new EntityKey(Buffer.from(driveKeyParam, 'base64'));
			}

			// Lean on getDriveKey with a specified driveID
			// TODO: In the future, loosen driveID requirement and fetch from fileID
			const driveId: DriveID = EID(parameters.getRequiredParameterValue(DriveIdParameter));
			return await parameters.getDriveKey({ driveId });
		})();

		const fileKey = await deriveFileKey(`${fileId}`, driveKey);
		if (options.verify) {
			const arweave = getArweaveFromURL(parameters.getGateway());
			const file = await new ArFSPrivateFileBuilder(
				fileId,
				new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(arweave) }),
				driveKey,
				undefined,
				fileKey
			).build();
			console.log(file.fileKey.toJSON());
		} else {
			console.log(fileKey.toJSON());
		}
	})
});
