import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveNameParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';
import { arDriveFactory, cliWalletDao } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'create-drive',
	parameters: [WalletFileParameter, SeedPhraseParameter, DriveNameParameter, DrivePasswordParameter],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet: Wallet = await context.getWallet();
		const ardrive = arDriveFactory(wallet);
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
