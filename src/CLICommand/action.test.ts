import { CLIAction } from './action';
// import { ParsedParameters } from './cli';

describe('The CLIAction class', () => {
	let action: CLIAction;

	describe('on trigger resolve', () => {
		// let beforeRunAwaiter: Promise<ParsedParameters>, afterRunAwaiter: Promise<ParsedParameters>;
		before(() => {
			action = new CLIAction();
		});

		it('Trigger resolves with a number exit code');
		it('The awaiters actually resolves with the parsedParameters');
		it('There is a static CLIAction.runningAction for instantly returning');
	});

	describe('on trigger reject', () => {
		beforeEach(() => {
			action = new CLIAction();
		});

		it('The awaiter rejects on trigger reject');
		it('The awaiter rejects when a parsing error is reported');
		it('The awaiter rejects when the action was not triggered');
		it('The static CLIAction.runningAction is undefined');
	});
});
