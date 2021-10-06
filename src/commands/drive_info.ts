import { CLICommand, ParametersHelper } from '../CLICommand';
import { DriveIdParameter, GetAllRevisionsParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'drive-info',
	parameters: [DriveIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet = await parameters.getOptionalWallet();
		const driveId: string = options.driveId;
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result = await (async function () {
			if (wallet) {
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveKey = await parameters.getDriveKey(driveId);

				return arDrive.getPrivateDrive(driveId, driveKey /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveAnonymousFactory();
				return arDrive.getPublicDrive(driveId /*, shouldGetAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
