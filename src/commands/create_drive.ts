import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DriveCreationPrivacyParameters,
	DriveNameParameter,
	DryRunParameter
} from '../parameter_declarations';
import { arDriveFactory } from '..';
import { JWKWallet, Wallet } from '../wallet';
import { PrivateDriveKeyData } from '../arfsdao';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';

new CLICommand({
	name: 'create-drive',
	parameters: [...DriveCreationPrivacyParameters, DriveNameParameter, BoostParameter, DryRunParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();

		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: options.dryRun
		});
		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const drivePassword = await parameters.getDrivePassword(true);
				const walletPrivateKey = (wallet as JWKWallet).getPrivateKey();
				const newDriveData = await PrivateDriveKeyData.from(drivePassword, walletPrivateKey);
				await ardrive.assertValidPassword(drivePassword);
				return ardrive.createPrivateDrive(options.driveName, newDriveData);
			} else {
				return ardrive.createPublicDrive(options.driveName);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
