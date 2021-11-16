import { FeeMultiple } from 'ardrive-core-js';
import { CLICommand } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { BoostParameter } from '../parameter_declarations';

async function getBaseFee(): Promise<string> {
	const response = await fetch(`https://arweave.net/price/0`);
	return response.text();
}

new CLICommand({
	name: 'base-fee',
	parameters: [BoostParameter],
	action: new CLIAction(async function action(options) {
		let baseFeeStr = await getBaseFee();
		if (options.boost) {
			const multiple = new FeeMultiple(+(options.boost as string));
			baseFeeStr = multiple.boostReward(baseFeeStr);
		}
		console.log(baseFeeStr);
		return SUCCESS_EXIT_CODE;
	})
});
