import { expect } from 'chai';
import { CLIAction } from './action';
import { ParsedParameters } from './cli';
import { ALL_VALID_EXIT_CODES, SUCCESS_EXIT_CODE } from './error_codes';

const dummyActionHandler = () => Promise.resolve(SUCCESS_EXIT_CODE);

describe('The CLIAction class', () => {
	let action: CLIAction;
	const params: ParsedParameters = {
		myCustomOption: 'the parameter value'
	};

	it('The static CLIAction.runningAction throws when is read read before calling trigger()', () => {
		expect(() => CLIAction.runningAction).to.throw();
	});

	describe('On trigger resolve', () => {
		let beforeTriggerAwaiter: Promise<ParsedParameters>, afterTriggerAwaiter: Promise<ParsedParameters>;

		before(() => {
			action = new CLIAction(dummyActionHandler);
			beforeTriggerAwaiter = action.actionAwaiter();
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
				throw new Error('Error from inside the action');
			});
			action
				.trigger(params)
				.catch((err) => err)
				.then((err) => expect(err).to.be.instanceOf(Error));
		});

		it('The awaiter rejects if a parsing error is thrown', () => {
			action = new CLIAction(dummyActionHandler);
			const awaiter = action.actionAwaiter();
			action.setParsingError(new Error('Error while parsing argv'));
			return awaiter.catch((err) => err).then((err) => expect(err).to.be.instanceOf(Error));
		});

		it('The awaiter rejects when the action was not triggered', () => {
			action = new CLIAction(dummyActionHandler);
			const awaiter = action.actionAwaiter();
			action.wasNotTriggered();
			return awaiter.catch((err) => err).then((err) => expect(err).to.be.instanceOf(Error));
		});
	});
});
