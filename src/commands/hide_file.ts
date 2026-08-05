import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
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
	name: 'hide-file',
	parameters: [
		FileIdParameter,
		BoostParameter,
		ShouldTurboParameter,
		TurboUrlParameter,
		DryRunParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());

		const dryRun = parameters.isDryRun();
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
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

		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFileId(fileId);
				const driveKey = await parameters.getDriveKey({
					driveId,
					arDrive: ardrive,
					owner: await wallet.getAddress()
				});

				return ardrive.hidePrivateFile({
					fileId,
					driveKey
				});
			} else {
				return ardrive.hidePublicFile({
					fileId
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
