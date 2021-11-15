import { AR, ADDR } from '../types';
import { cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	ArAmountParameter,
	BoostParameter,
	DestinationAddressParameter,
	DryRunParameter,
	WalletFileParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);
		const destAddress = parameters.getRequiredParameterValue(DestinationAddressParameter, ADDR);
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		const boost = parameters.getOptionalBoostSetting();
		console.log(`Source address: ${walletAddress}`);
		console.log(`AR amount sent: ${arAmount.toString()}`);
		console.log(`Destination address: ${destAddress}`);
		const rewardSetting = boost ? { feeMultiple: boost } : undefined;
		const dryRun = !!parameters.getParameterValue(DryRunParameter);

		const arTransferResult = await cliWalletDao.sendARToAddress(
			arAmount,
			wallet,
			destAddress,
			rewardSetting,
			dryRun,
			[
				{ name: 'App-Name', value: CLI_APP_NAME },
				{ name: 'App-Version', value: CLI_APP_VERSION },
				{ name: 'Type', value: 'transfer' }
			],
			true
		);

		console.log(JSON.stringify(arTransferResult, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
