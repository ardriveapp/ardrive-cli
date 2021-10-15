import { expect } from 'chai';

interface expectAsyncErrorThrowParams {
	promiseToError: Promise<unknown>;
	// TODO: Define error types,
	// errorType: 'Error' | 'TypeError' | ...
	errorType?: string;
	errorMessage?: string;
}

/**
 * Test helper function that takes a promise and will expect a caught error
 *
 * @param promiseToError the promise on which to expect a thrown error
 * @param errorType type of error to expect, defaults to 'Error'
 * @param errorMessage exact error message to expect
 * */
export async function expectAsyncErrorThrow({
	promiseToError,
	errorType = 'Error',
	errorMessage
}: expectAsyncErrorThrowParams): Promise<void> {
	let error: null | Error = null;
	try {
		await promiseToError;
	} catch (err) {
		error = err;
	}

	expect(error?.name).to.equal(errorType);

	if (errorMessage) {
		expect(error?.message).to.equal(errorMessage);
	}
}
