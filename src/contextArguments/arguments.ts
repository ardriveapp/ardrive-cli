import { help } from 'yargs';
import ContextArguments, { ArgumentConfig } from './index';

export const PING_TEXT_ARG = 'ping-text';
export const USERNAME_ARG = 'username';
export const PASSWORD_ARG = 'password';
export const PASSWORD_REPEAT_ARG = 'password-repeat';
export const AUTO_SYNC_FOLDER_ARG = 'auto-sync-folder';
export const AUTO_SYNC_FOLDER_APPROVAL_ARG = 'auto-sync-folder-approval';
export const CONFIRM_USER_CREATION_ARG = 'confirm-user-creation';
export const PUBLIC_ARG = 'public';
export const DRIVE_ID_ARG = 'drive-id';

const YES_NO_CHOICES = [
	{ title: 'Yes', value: true },
	{ title: 'No', value: false }
];

const ARGUMENTS: ArgumentConfig[] = [
	{
		name: PING_TEXT_ARG,
		type: 'text',
		humanReadableMessage: 'Ping text:',
		commandLineFlags: ['t'],
		cacheable: false,
		help: ''
	},
	{
		name: USERNAME_ARG,
		type: 'text',
		humanReadableMessage: 'Login:',
		commandLineFlags: ['u', 'username'],
		validate(value): string | boolean {
			return value !== '';
		},
		cacheable: true,
		help: ''
	},
	{
		name: PASSWORD_ARG,
		type: 'text',
		style: 'password',
		humanReadableMessage: 'Password:',
		commandLineFlags: [],
		cacheable: false,
		help: ''
	},
	{
		name: PASSWORD_REPEAT_ARG,
		type: 'text',
		style: 'password',
		humanReadableMessage: 'Password repeat',
		commandLineFlags: [],
		cacheable: false,
		help: ''
	},
	{
		name: AUTO_SYNC_FOLDER_ARG,
		type: 'path',
		humanReadableMessage: 'Auto-sync path:',
		cacheable: false,
		commandLineFlags: ['f', 'folder'],
		help: ''
	},
	{
		name: AUTO_SYNC_FOLDER_APPROVAL_ARG,
		type: 'select',
		choices: YES_NO_CHOICES,
		humanReadableMessage: 'Would you like to enable auto-syncing?',
		cacheable: false,
		commandLineFlags: ['a', 'auto'],
		help: ''
	},
	{
		name: CONFIRM_USER_CREATION_ARG,
		type: 'select',
		choices: YES_NO_CHOICES,
		humanReadableMessage: 'Do you confirm the user creation?',
		cacheable: false,
		commandLineFlags: [],
		help: ''
	},
	{
		name: PUBLIC_ARG,
		type: 'boolean',
		cacheable: false,
		default: false,
		commandLineFlags: ['public'],
		help: ''
	},
	{
		name: DRIVE_ID_ARG,
		type: 'select',
		cacheable: false,
		humanReadableMessage: 'Choose a drive id:',
		commandLineFlags: ['i', 'id'],
		help: ''
	}
];

ContextArguments.setArguments(ARGUMENTS);
