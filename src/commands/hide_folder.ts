import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FolderIdParameter,
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
	name: 'hide-folder',
	parameters: [
		FolderIdParameter,
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
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const shouldUseTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			turboSettings: shouldUseTurbo ? { turboUrl } : undefined,
			dryRun,
			arweave
		});

		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey({
					driveId,
					arDrive: ardrive,
					owner: await wallet.getAddress()
				});

				return ardrive.hidePrivateFolder({
					folderId,
					driveKey
				});
			} else {
				return ardrive.hidePublicFolder({
					folderId
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
