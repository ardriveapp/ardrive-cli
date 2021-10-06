import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous, ArFSPrivateFile, ArFSPublicFile } from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	FileIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { FileID } from '../types';

/* eslint-disable no-console */

new CLICommand({
	name: 'file-info',
	parameters: [
		FileIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const fileId: FileID = options.fileId;
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicFile | ArFSPrivateFile> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveId = await arDrive.getDriveIdForFileId(fileId);

				const driveKey = await parameters.getDriveKey(driveId);

				return arDrive.getPrivateFile(fileId, driveKey /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
				return arDrive.getPublicFile(fileId /*, shouldGetAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary
		delete result.syncStatus;

		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
