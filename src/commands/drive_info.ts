import { ArDrive } from '../ardrive';
import { ArFSDAO } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arweave } from '..';

/* eslint-disable no-console */

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
