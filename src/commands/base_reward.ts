import { ByteCount } from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { BoostParameter } from '../parameter_declarations';
import axios, { AxiosResponse } from 'axios';

async function getBaseReward(byteCount?: ByteCount): Promise<string> {
	const response: AxiosResponse = await axios.get(`https://arweave.net/price/${byteCount ?? 0}`);
	return `${response.data}`;
}

new CLICommand({
	name: 'base-reward',
	parameters: [BoostParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		let baseRewardStr = await getBaseReward();
		const multiple = parameters.getOptionalBoostSetting();
		if (multiple) {
			baseRewardStr = multiple.boostReward(baseRewardStr);
		}

		console.log(baseRewardStr);
		return SUCCESS_EXIT_CODE;
	})
});
