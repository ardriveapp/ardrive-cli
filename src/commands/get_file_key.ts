import { deriveFileKey } from 'ardrive-core-js';
import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveCreationPrivacyParameters,
	DriveIdParameter,
	DriveKeyParameter,
	FileIdParameter,
	NoVerifyParameter
} from '../parameter_declarations';
import { DriveID, EID } from '../types';
import { urlEncodeHashKey } from '../utils';
import { ArFSPrivateFileBuilder } from '../utils/arfs_builders/arfs_file_builders';

new CLICommand({
	name: 'get-file-key',
	parameters: [
		...DriveCreationPrivacyParameters,
		DriveIdParameter,
		DriveKeyParameter,
		FileIdParameter,
		NoVerifyParameter
	],
	async action(options) {
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
			await new ArFSPrivateFileBuilder(fileId, cliArweave, driveKey, undefined, fileKey).build();
		}

		console.log(urlEncodeHashKey(fileKey));
	}
});
