import { clientInstance } from './daemon-connection';
import { Action } from './actions';
import ContextArguments, { ALL_TAGS } from './contextArguments';

class CLI {
	async run() {
		const tag = await ContextArguments.get('$1');
		const name = await ContextArguments.get('$2');
		const action = await Action.resolve(tag, name);
		if (action) {
			await fireAction(action);
		} else {
			const actionNames = Action.getAllActionNamesForTag(tag);
			const wrongTag = actionNames.length === 0;
			if (wrongTag) {
				help();
			} else {
				helpForTag(tag);
			}
		}
	}
}

async function fireAction(action: Action): Promise<any> {
	return await action
		.fire()
		.then(console.log)
		.catch((e) => {
			console.log(`Error on action ${Action.getIdentifier(action)}. ${e}`);
		})
		.finally(() => {
			clientInstance.disconnect();
		});
}

function help(): void {
	const help = `All possible command tags are:\n\t>${ALL_TAGS.join('\t>')}`;
	console.log(help);
}

function helpForTag(tag: string): void {
	const actionNames = Action.getAllActionNamesForTag(tag);
	const help = ``;
	Promise.all(actionNames.map(async (name) => await Action.resolve(tag, name)))
		.then((/*actions: Action[]*/) => {})
		.then(() => {
			[console.log(help)];
		});
}

if (require.main === module) {
	const cliInstance = new CLI();
	cliInstance.run();
}
