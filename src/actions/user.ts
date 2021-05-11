import { Action, ActionContext, ScriptItem, Result } from './Action';
import ContextArguments, { PASSWORD_ARG, USERNAME_ARG, USER_TAG } from '../contextArguments';
import {
	AUTO_SYNC_FOLDER_ARG,
	AUTO_SYNC_FOLDER_APPROVAL_ARG,
	CONFIRM_USER_CREATION_ARG
} from '../contextArguments/arguments';
import { CreateWalletAction } from './wallet';
import { clientInstance } from '../daemon-connection';

interface UserData {
	login: string;
	password: string;
	syncFolderPath: string;
	autoSyncApproval: boolean;
	wallet: any;
}

class promptUserCredentialsScript extends ScriptItem<UserData> {
	public name = 'create-user';
	public failOnError = true;

	public _scriptHandler = async (context: ActionContext) => {
		const wallet = context.get<any>('wallet.create');
		if (wallet) {
			const login = await ContextArguments.get(USERNAME_ARG);
			const password = await ContextArguments.get(PASSWORD_ARG);
			const syncFolderPath: string = await ContextArguments.get(AUTO_SYNC_FOLDER_ARG);
			const autoSyncApproval: boolean = await ContextArguments.get(AUTO_SYNC_FOLDER_APPROVAL_ARG);
			const user: UserData = {
				login,
				password,
				syncFolderPath,
				autoSyncApproval,
				wallet
			};
			return user;
		}
		throw new Error('Missing wallet');
	};
}

class confirmUserCreation extends ScriptItem<boolean> {
	public name = 'confirm';

	public _scriptHandler = async (context: ActionContext) => {
		const confirmation: boolean = await ContextArguments.get(CONFIRM_USER_CREATION_ARG);
		const user = context.get<UserData>('create-user');
		if (confirmation && user) {
			await clientInstance.createArDriveUser(
				user.login,
				user.password,
				user.wallet,
				user.syncFolderPath,
				user.autoSyncApproval
			);
		}
		return confirmation;
	};
}

class authenticateUser extends ScriptItem<boolean> {
	public name = 'authenticate';

	public _scriptHandler = async () => {
		const login = await ContextArguments.get(USERNAME_ARG);
		const password = await ContextArguments.get(PASSWORD_ARG);
		return await clientInstance.authenticateArDriveUser(login, password);
	};
}

export class CreateUserAction extends Action {
	public tag = USER_TAG;
	public name = 'create';
	public userAccesible = true;
	public script = [new CreateWalletAction(), new promptUserCredentialsScript(), new confirmUserCreation()];
}

export class AuthenticateUserAction extends Action {
	public tag = USER_TAG;
	public name = 'authenticate';
	public userAccesible = true;
	public script = [new authenticateUser()];

	_parseResponse(results: Result<boolean>[]): string {
		const result = results[0].getValue();
		return result ? 'Authenticateed' : 'Not authenticated';
	}
}

Action.registerAction(new CreateUserAction());
Action.registerAction(new AuthenticateUserAction());
