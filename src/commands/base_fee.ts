import { CLICommand } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { BoostParameter } from '../parameter_declarations';
import { FeeMultiple } from '../types';
import { getBaseFee } from '../utils';

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
