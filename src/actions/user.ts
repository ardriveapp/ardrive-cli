import { Action, ActionContext, ScriptItem } from '../actions';
import ContextArguments, { PASSWORD_ARG, USERNAME_ARG } from '../contextArguments';

import { addNewUser, ArDriveUser } from 'ardrive-core-js';
import { Wallet } from 'ardrive-core-js/lib/types';
import { AUTO_SYNC_FOLDER, AUTO_SYNC_FOLDER_APPROVAL, CONFIRM_USER_CREATION } from '../contextArguments/arguments';
import { CreateWalletAction } from './wallet';

const USER_TAG = 'user';

class createUserScript extends ScriptItem<ArDriveUser> {
	name = 'create-user';
	_scriptHandler = async (context: ActionContext) => {
		const wallet = context.get<Wallet>('setup-wallet');
		if (wallet) {
			const username = await ContextArguments.get(USERNAME_ARG);
			const password = await ContextArguments.get(PASSWORD_ARG);
			const syncFolderApproval: boolean = await ContextArguments.get(AUTO_SYNC_FOLDER_APPROVAL);
			const syncFolderPath: string = await ContextArguments.get(AUTO_SYNC_FOLDER);
			const user: ArDriveUser = {
				login: username,
				dataProtectionKey: password,
				walletPrivateKey: JSON.stringify(wallet.walletPrivateKey),
				walletPublicKey: wallet.walletPublicKey,
				syncFolderPath: syncFolderPath,
				autoSyncApproval: syncFolderApproval ? 1 : 0
			};
			return user;
		}
		throw new Error('Missing wallet');
	};
}

class confirmUserCreation extends ScriptItem<boolean> {
	name = 'confirm';
	_scriptHandler = async (context: ActionContext) => {
		const confirmation: boolean = await ContextArguments.get(CONFIRM_USER_CREATION);
		const user: ArDriveUser | null = context.get('create-user');
		if (confirmation && user) {
			addNewUser(user.dataProtectionKey, user);
		}
		return confirmation;
	};
}

export class CreateUserAction extends Action {
	tag = USER_TAG;
	name = 'create';
	userAccesible = true;
	script = [new CreateWalletAction(), new createUserScript(), new confirmUserCreation()];
}
