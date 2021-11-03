import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	FolderNameParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { arDriveFactory } from '..';
import { Wallet } from '../wallet';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { EID } from '../types/entity_id';

new CLICommand({
	name: 'create-folder',
	parameters: [
		ParentFolderIdParameter,
		FolderNameParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters
	],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: options.dryRun
		});

		const parentFolderId = EID(parameters.getRequiredParameterValue(ParentFolderIdParameter));
		const driveId = await ardrive.getDriveIdForFolderId(options.parentFolderId);
		const folderName = options.folderName;

		const createFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveKey = await parameters.getDriveKey({ driveId });
				return ardrive.createPrivateFolder({
					folderName,
					driveId,
					driveKey,
					parentFolderId
				});
			} else {
				return ardrive.createPublicFolder({ folderName, driveId, parentFolderId });
			}
		})();
		console.log(JSON.stringify(createFolderResult, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
