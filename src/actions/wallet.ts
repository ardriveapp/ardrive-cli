import { Action, ScriptItem } from './index';
import { createArDriveWallet } from 'ardrive-core-js';
import { Wallet } from 'ardrive-core-js/lib/types';

const WALLET_TAG = 'wallet';

class createWalletScript extends ScriptItem<Wallet> {
	name = 'create-wallet';

	_scriptHandler = async (): Promise<Wallet> => {
		const wallet = createArDriveWallet();
		return wallet;
	};
}

export class CreateWalletAction extends Action {
	tag = WALLET_TAG;
	name = 'create';
	userAccesible = true;
	script: ScriptItem<any>[] = [new createWalletScript()];
}
