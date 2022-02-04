import { ByteCount } from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { BoostParameter, GatewayParameter } from '../parameter_declarations';
import axios, { AxiosResponse } from 'axios';

async function getBaseReward(gateway: URL, byteCount?: ByteCount): Promise<string> {
	const response: AxiosResponse = await axios.get(`${gateway.href}price/${byteCount ?? 0}`);
	return `${response.data}`;
}

new CLICommand({
	name: 'base-reward',
	parameters: [BoostParameter, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const gateway = parameters.getGateway();
		let baseRewardStr = await getBaseReward(gateway);
		const multiple = parameters.getOptionalBoostSetting();
		if (multiple) {
			baseRewardStr = multiple.boostReward(baseRewardStr);
		}

		console.log(baseRewardStr);
		return SUCCESS_EXIT_CODE;
	})
});
