import { expect } from 'chai';
import { CLIAction } from './action';
import { ParsedParameters } from './cli';
import { ALL_VALID_EXIT_CODES, SUCCESS_EXIT_CODE } from './error_codes';

describe('The CLIAction class', () => {
	let action: CLIAction;
	const params: ParsedParameters = {
		myCustomOption: 'the parameter value'
	};

	describe('On trigger resolve', () => {
		let beforeTriggerAwaiter: Promise<ParsedParameters>, afterTriggerAwaiter: Promise<ParsedParameters>;

		before(() => {
			action = new CLIAction(async () => SUCCESS_EXIT_CODE);
			beforeTriggerAwaiter = action.actionAwaiter();
		});

		it('Trigger resolves with the parsed options when no callback is passed', () => {
			// a feature for easy testing command executions
			const actionWithNoCallback = new CLIAction();
			return actionWithNoCallback
				.trigger(params)
				.then((parsedParameters) => expect(parsedParameters).to.eql(params));
		});

		it('Trigger resolves with a valid exit code', () => {
			return action.trigger(params).then((exitCode) => expect(ALL_VALID_EXIT_CODES).to.include(exitCode));
		});

		it('The before awaiter resolves with the parsedParameters', () => {
			return beforeTriggerAwaiter.then((parsedParameters) => expect(parsedParameters).to.eql(params));
		});

		it('The after awaiter resolves with the parsedParameters', () => {
			afterTriggerAwaiter = action.actionAwaiter();
			return afterTriggerAwaiter.then((parsedParameters) => {
				expect(parsedParameters).to.eql(params);
				expect(() => CLIAction.runningAction).to.not.throw();
			});
		});
	});

	describe('On trigger reject', () => {
		it('The awaiter rejects on trigger reject', () => {
			action = new CLIAction(async () => {
				throw new Error('BOOM!!! 3:)');
			});
			action
				.trigger(params)
				.catch((err) => err)
				.then((err) => expect(err).to.be.instanceOf(Error));
		});

		it('The awaiter rejects when a parsing error is reported', () => {
			action = new CLIAction();
			action.setParsingError(new Error('some wrong flag :P'));
			return action
				.actionAwaiter()
				.catch((err) => err)
				.then((err) => expect(err).to.be.instanceOf(Error));
		});
		it('The awaiter rejects when the action was not triggered', () => {
			action = new CLIAction();
			action.wasNotTriggered();
			return action
				.actionAwaiter()
				.catch((err) => err)
				.then((err) => expect(err).to.be.instanceOf(Error));
		});
		it('The static CLIAction.runningAction throws when read', () => {
			expect(() => CLIAction.runningAction).to.throw();
		});
	});
});
