import { expect } from 'chai';

/** Test helper function that takes an async function and will expect a caught Error */
export async function expectAsyncErrorThrow(method: () => Promise<unknown>): Promise<void> {
	let error: null | string = null;
	try {
		await method();
	} catch (err) {
		error = err;
	}
	expect(error).to.be.an('Error');
}
