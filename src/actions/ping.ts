import { Action, Result, ScriptItem } from './Action';
import ContextArguments from '../contextArguments';
import { PING_TEXT_ARG } from '../contextArguments/arguments';
import ClientService from '../daemon-connection';

const PING_TAG = 'ping';

class pingScript extends ScriptItem<string> {
	name = 'ping';

	async _scriptHandler(): Promise<string> {
		const pingText = await ContextArguments.get(PING_TEXT_ARG);
		const response = await ClientService.run<string>(this.name, pingText);
		return response;
	}
}

export class PingAction extends Action {
	tag = PING_TAG;
	name = '';
	public userAccesible = true;
	script = [new pingScript()];
	protected _parseResponse(results: Result<any>[]): string {
		return results[0].getValue();
	}
}

Action.registerAction(new PingAction());
