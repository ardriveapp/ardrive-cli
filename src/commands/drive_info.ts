import { CLICommand, ParametersHelper } from '../CLICommand';
import { ArFSPrivateDrive, ArFSPublicDrive } from '../arfsdao';
import { DriveID } from '../types';
import { DriveIdParameter, GetAllRevisionsParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory } from '..';

new CLICommand({
	name: 'drive-info',
	parameters: [DriveIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options);

		const driveId: DriveID = options.driveId;
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicDrive | ArFSPrivateDrive> = await (async function () {
			if (parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveKey = await parameters.getDriveKey(driveId);

				return arDrive.getPrivateDrive(driveId, driveKey /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveAnonymousFactory();
				return arDrive.getPublicDrive(driveId /*, shouldGetAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary
		delete result.syncStatus;

		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
