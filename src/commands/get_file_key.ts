import { ArFSPrivateFileBuilder, deriveFileKey, DriveID, EID, urlEncodeHashKey } from 'ardrive-core-js';
import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveCreationPrivacyParameters,
	DriveIdParameter,
	DriveKeyParameter,
	FileIdParameter,
	NoVerifyParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'get-file-key',
	parameters: [
		...DriveCreationPrivacyParameters,
		DriveIdParameter,
		DriveKeyParameter,
		FileIdParameter,
		NoVerifyParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const fileId = EID(parameters.getRequiredParameterValue(FileIdParameter));

		// Obviate the need for a drive ID when a drive key is specified
		const driveKey = await (async () => {
			const driveKeyParam = parameters.getParameterValue(DriveKeyParameter);
			if (driveKeyParam) {
				return Buffer.from(driveKeyParam, 'base64');
			}

			// Lean on getDriveKey with a specified driveID
			// TODO: In the future, loosen driveID requirement and fetch from fileID
			const driveId: DriveID = EID(parameters.getRequiredParameterValue(DriveIdParameter));
			return await parameters.getDriveKey({ driveId });
		})();

		const fileKey = await deriveFileKey(`${fileId}`, driveKey);
		if (options.verify) {
			const file = await new ArFSPrivateFileBuilder(fileId, cliArweave, driveKey, undefined).build();
			console.log(urlEncodeHashKey(file.fileKey));
		} else {
			console.log(urlEncodeHashKey(fileKey));
		}
	})
});
