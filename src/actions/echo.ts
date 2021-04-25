import { Action, Result, ScriptItem } from './Action';
import ContextArguments, { ECHO_TAG } from '../contextArguments';
import { PING_TEXT_ARG } from '../contextArguments/arguments';
import { clientInstance } from '../daemon-connection';

class echoScript extends ScriptItem<string> {
	public name = 'echo';

	public async _scriptHandler(): Promise<string> {
		const pingText = await ContextArguments.get(PING_TEXT_ARG);
		const response = await clientInstance.run<string>(this.name, pingText);
		return response;
	}
}

export class EchoAction extends Action {
	public tag = ECHO_TAG;
	public name = '';
	public userAccesible = true;
	public script = [new echoScript()];

	protected _parseResponse(results: Result<any>[]): string {
		return results[0].getValue();
	}
}

Action.registerAction(new EchoAction());
