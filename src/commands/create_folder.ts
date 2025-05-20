import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	FolderNameParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	ShouldTurboParameter,
	TurboUrlParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { Wallet, EID } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-folder',
	parameters: [
		ParentFolderIdParameter,
		FolderNameParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();
		const dryRun = parameters.isDryRun();
		const arweave = getArweaveFromURL(parameters.getGateway());
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const ardrive = cliArDriveFactory({
			wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun,
			arweave,
			turboSettings: useTurbo ? { turboUrl } : undefined
		});

		const parentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		const driveId = await ardrive.getDriveIdForFolderId(parentFolderId);
		const folderName = parameters.getRequiredParameterValue(FolderNameParameter);

		const createFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveSignatureInfo = await ardrive.getDriveSignatureInfo(driveId, await wallet.getAddress());
				const driveKey = await parameters.getDriveKey({ driveId, driveSignatureInfo });
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
	})
});
