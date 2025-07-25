import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	TurboUrlParameter,
	DriveCreationPrivacyParameters,
	DriveNameParameter,
	DryRunParameter,
	GatewayParameter,
	ShouldBundleParameter,
	ShouldTurboParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { Wallet, PrivateDriveKeyData } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-drive',
	parameters: [
		DryRunParameter,
		DriveNameParameter,
		...DriveCreationPrivacyParameters,
		ShouldBundleParameter,
		BoostParameter,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();
		const dryRun = parameters.isDryRun();
		const driveName = parameters.getRequiredParameterValue(DriveNameParameter);
		const shouldBundle = !!parameters.getParameterValue(ShouldBundleParameter);
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const turboUrl = parameters.getTurbo();

		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun,
			shouldBundle,
			arweave,
			turboSettings: useTurbo ? { turboUrl } : undefined
		});

		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const drivePassword = await parameters.getDrivePassword(true);
				const newPrivateDriveData = await PrivateDriveKeyData.from(drivePassword, wallet);
				console.log('newPrivateDriveData', newPrivateDriveData);
				await ardrive.assertValidPassword(drivePassword);
				console.log('drivePassword', drivePassword);
				return ardrive.createPrivateDrive({ driveName, newPrivateDriveData });
			} else {
				return ardrive.createPublicDrive({ driveName });
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
