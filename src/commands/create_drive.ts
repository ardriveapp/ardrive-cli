import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	BundlerUrlParameter,
	DriveCreationPrivacyParameters,
	DriveNameParameter,
	DryRunParameter,
	GatewayParameter,
	ShouldBundleParameter,
	ShouldBundlerParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { Wallet, JWKWallet, PrivateDriveKeyData } from 'ardrive-core-js';
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
		ShouldBundlerParameter,
		BundlerUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();
		const dryRun = parameters.isDryRun();
		const driveName = parameters.getRequiredParameterValue(DriveNameParameter);
		const shouldBundle = !!parameters.getParameterValue(ShouldBundleParameter);
		const useBundler = !!parameters.getParameterValue(ShouldBundlerParameter);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const bundlerUrl = parameters.getBundler();

		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun,
			shouldBundle,
			arweave,
			bundlerUrl,
			useBundler
		});

		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const drivePassword = await parameters.getDrivePassword(true);
				const walletPrivateKey = (wallet as JWKWallet).getPrivateKey();
				const newPrivateDriveData = await PrivateDriveKeyData.from(drivePassword, walletPrivateKey);
				await ardrive.assertValidPassword(drivePassword);
				return ardrive.createPrivateDrive({ driveName, newPrivateDriveData });
			} else {
				return ardrive.createPublicDrive({ driveName });
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
