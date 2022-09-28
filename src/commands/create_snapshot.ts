import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	// FolderNameParameter,
	DryRunParameter,
	// ParentFolderIdParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	DriveIdParameter
} from '../parameter_declarations';
// import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
// import { Wallet, EID } from 'ardrive-core-js';
// import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-snapshot',
	parameters: [DriveIdParameter, BoostParameter, DryRunParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		// const wallet: Wallet = await parameters.getRequiredWallet();
		// const dryRun = parameters.isDryRun();
		// const arweave = getArweaveFromURL(parameters.getGateway());

		// const ardrive = cliArDriveFactory({
		// 	wallet,
		// 	feeMultiple: parameters.getOptionalBoostSetting(),
		// 	dryRun,
		// 	arweave
		// });

		// const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		// const folderName = parameters.getRequiredParameterValue(FolderNameParameter);

		const createFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				// const driveKey = await parameters.getDriveKey({ driveId });
				throw new Error('Unimplemented');
			} else {
				throw new Error('Unimplemented');
			}
		})();
		console.log(JSON.stringify(createFolderResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
