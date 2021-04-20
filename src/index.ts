#!/usr/bin/env node
import ClientService from './daemon-connection';
import { Action } from './actions';
import './actions/ping';
// import yargs from 'yargs';

// function getAction() {}

Action.resolve('ping').then(async (pingAction: Action) => {
	await pingAction
		.fire()
		.then(() => {
			debugger;
			const pingResponse = pingAction.result;
			console.log(`Ping response: "${pingResponse}"`);
		})
		.then(() => {
			debugger;
			ClientService.disconnect();
		})
		.catch((e) => {
			console.log(e);
			debugger;
		});
});
