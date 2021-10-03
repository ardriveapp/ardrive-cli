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
		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const folderId: string = options.folderId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateFolder(folderId, options.drivePassword /*, getAllRevisions*/);
			} else {
				const arDrive = arDriveFactory();
				const folderId: string = options.folderId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicFolder(folderId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
