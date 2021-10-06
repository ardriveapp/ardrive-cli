import { ArFSPrivateFolder, ArFSPublicFolder } from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	FolderIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'folder-info',
	parameters: [
		FolderIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const parameters = new ParametersHelper(options);
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicFolder | ArFSPrivateFolder> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const folderId: string = options.folderId;

				const driveId = await arDrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey(driveId);

				return arDrive.getPrivateFolder(folderId, driveKey /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveFactory();
				const folderId: string = options.folderId;
				return arDrive.getPublicFolder(folderId /*, shouldGetAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary
		delete result.lastModifiedDate;
		delete result.syncStatus;

		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
