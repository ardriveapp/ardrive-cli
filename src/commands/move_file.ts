import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	ShouldTurboParameter,
	TurboUrlParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, Wallet } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'move-file',
	parameters: [
		FileIdParameter,
		ParentFolderIdParameter,
		BoostParameter,
		DryRunParameter,
		ShouldTurboParameter,
		TurboUrlParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());

		const dryRun = parameters.isDryRun();
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const newParentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		const shouldUseTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun,
			turboSettings: shouldUseTurbo ? { turboUrl } : undefined,
			arweave
		});

		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(newParentFolderId);
				const driveKey = await parameters.getDriveKey({
					driveId,
					arDrive: ardrive,
					walletAddress: await wallet.getAddress()
				});

				return ardrive.movePrivateFile({ fileId, newParentFolderId, driveKey });
			} else {
				return ardrive.movePublicFile({ fileId, newParentFolderId });
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
