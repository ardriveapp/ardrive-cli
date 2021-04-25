import { clientInstance } from '../daemon-connection';
import { Action, ScriptItem, Result } from './Action';

const WALLET_TAG = 'wallet';

class createWalletScript extends ScriptItem<any> {
	public name = 'create-wallet';

	public _scriptHandler = async (): Promise<any> => {
		const wallet = await clientInstance.createArDriveWallet();
		return wallet;
	};
}

export class CreateWalletAction extends Action {
	public tag = WALLET_TAG;
	public name = 'create';
	public userAccesible = true;
	public script: ScriptItem<any>[] = [new createWalletScript()];

	public _parseResponse(results: Result<any>[]): any {
		const result_1 = results[0];
		return result_1?.getValue();
	}
}

Action.registerAction(new CreateWalletAction());
