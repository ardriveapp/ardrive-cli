import { Action, ActionContext, Result, ScriptItem } from './Action';
import ContextArguments, { DRIVE_TAG } from '../contextArguments';
import { PUBLIC_ARG } from '../contextArguments/arguments';
import { clientInstance } from '../daemon-connection';
import { Choices } from '../prompts/prompters';
import { DriveData } from 'ardrive-daemon/lib/constants';

const DRIVE_ID_ALIAS = 'drive-id';
type privacyType = 'private' | 'public';

class getPrivacyScript extends ScriptItem<privacyType> {
	public name = 'privacy';

	public async _scriptHandler(): Promise<privacyType> {
		const isPublic = ContextArguments.get(PUBLIC_ARG);
		return (isPublic && 'public') || 'private';
	}
}

class getDrivesScript extends ScriptItem<any> {
	public name = 'get-unsynced-drives';

	public async _scriptHandler(context: ActionContext): Promise<any> {
		const login = context.get<string>('login') as string;
		const privacy = context.get<privacyType>('privacy') as privacyType;
		const unsyncedDrives = await clientInstance.getUnsyncedDrives(login, privacy);
		return unsyncedDrives;
	}
}

class selectDriveIdScript extends ScriptItem<string> {
	public name = 'select-drive';
	public alias = DRIVE_ID_ALIAS;

	public async _scriptHandler(context: ActionContext): Promise<string> {
		const choices = context.get<DriveData[]>('get-unsynced-drives');
		const chosen = await ContextArguments.promptDriveId(
			choices?.map((d) => {
				return { title: d.driveName, value: d };
			}) as Choices
		);
		return chosen;
	}
}

class doTheImport extends ScriptItem<boolean> {
	public name = 'finish'

	public async _scriptHandler(context: ActionContext): Promise<boolean> {
		const driveId = clientInstance.
	}
}

class createDriveIdScript extends ScriptItem<string> {
	public name = 'create-drive';
	public alias = DRIVE_ID_ALIAS;

	public async _scriptHandler(): Promise<string> {
		// const pingText = await ContextArguments.get('');
		// const response = await clientInstance.createArDrive(this.name, pingText);
		// return response;
		return '';
	}
}

export class ImportDriveAction extends Action {
	public tag = DRIVE_TAG;
	public name = 'import';
	public userAccesible = true;
	public script = [new getPrivacyScript(), new getDrivesScript(), new selectDriveIdScript()];

	protected _parseResponse(results: Result<any>[]): string {
		return results[0].getValue();
	}
}

export class CreateDriveAction extends Action {
	public tag = DRIVE_TAG;
	public name = 'create';
	public userAccesible = true;
	public script = [new createDriveIdScript()];
	protected requiresAuthentication = true;

	protected _parseResponse(results: Result<any>[]): string {
		return results[0].getValue();
	}
}

Action.registerAction(new ImportDriveAction());
Action.registerAction(new CreateDriveAction());

// export const promptToAddOrCreatePersonalPrivateDrive = async (user: ArDriveUser): Promise<string> => {
// 	const addDrive: string = prompt('  Would you like to add a Private Personal Drive? (default is No) Y/N ');
// 	if (addDrive.toUpperCase() === 'Y') {
// 		const privateDrives = await getAllUnSyncedPersonalDrivesByLoginFromDriveTable(user.login, 'private');
// 		if (privateDrives.length > 0) {
// 			const privateDrive: ArFSDriveMetaData = await promptForArDriveId(user.login, privateDrives, 'private');
// 			await addDriveToDriveTable(privateDrive);
// 			await setDriveToSync(privateDrive.driveId);
// 			return 'Added Drive';
// 		} else {
// 			let driveName: string = prompt('   Please enter a name for your new private drive: ');
// 			driveName = await sanitizePath(driveName);
// 			if (driveName !== '') {
// 				const privateDrive = await createNewPrivateDrive(user.login, driveName);
// 				await addDriveToDriveTable(privateDrive);
// 				return 'Created Drive';
// 			} else {
// 				console.log('    Invalid drive name!');
// 				return await promptToAddOrCreatePersonalPrivateDrive(user);
// 			}
// 		}
// 	}
// 	return 'None Added';
// };
