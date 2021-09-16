import { ArDrive } from '../ardrive';
import { ArFSDAO } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DriveNameParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';
import { arweave } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'create-drive',
	parameters: [WalletFileParameter, SeedPhraseParameter, DriveNameParameter, DrivePasswordParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet: Wallet = await context.getWallet();
		const ardrive = new ArDrive(new ArFSDAO(wallet, arweave));
		const createDriveResult = await (async function () {
			if (await context.getIsPrivate()) {
				return ardrive.createPrivateDrive(options.driveName, options.drivePassword);
			} else {
				return ardrive.createPublicDrive(options.driveName);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		process.exit(0);
	}
});

new CLICommand({
	name: 'drive-info',
	parameters: [
		DriveIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const context = new CommonContext(options);
		const wallet = await context.getWallet();
		const arDrive = new ArDrive(new ArFSDAO(wallet, arweave));
		const driveId: string = options.driveId;
		// const getAllRevisions: boolean = options.getAllRevisions;
		const result = await arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
