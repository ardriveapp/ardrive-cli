#!/usr/bin/env node
import ClientService from './daemon-connection';
import { Action } from './actions';
import './actions/ping';
import ContextArguments from './contextArguments';
// import yargs from 'yargs';

// function getAction() {}

class CLI {
	async run() {
		const tag = await ContextArguments.get('$1');
		const name = await ContextArguments.get('$2');
		const action = await Action.resolve(tag, name);
		if (action) {
			await fireAction(action);
		} else {
			throw new Error('Action not found');
		}
	}
}

async function fireAction(action: Action): Promise<any> {
	return await action
		.fire()
		.then(() => {
			ClientService.disconnect();
		})
		.catch((e) => {
			console.log(`Error on action ${Action.getIdentifier(action)}. ${e}`);
		});
}

if (require.main === module) {
	const cliInstance = new CLI();
	cliInstance.run();
}
