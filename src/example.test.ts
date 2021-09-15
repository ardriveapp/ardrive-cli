/**
 * This is an example unit test used to showcase the testing
 * libraries and to ensure each the following are functional:
 *
 * Chai
 * Asynchronous Mocha testing
 * Sinon -- spies / stubs / mocks
 * Power-assert
 *
 * To run this example on it's own, use: yarn test -g 'basicInputOutputExample'
 *
 * For an integration test example, visit `/tests/example.test.ts`
 */

import { sleep } from 'ardrive-core-js';

// Common imports with chai/sinon
import { expect } from 'chai';
import { mock, spy, stub } from 'sinon';

// Power-assert must be imported with require to work
import assert = require('assert');

/**
 * Normally we would not define our test functions here. Unit
 * tests belong adjacent to the file they're testing. In this case
 * they would preferably be defined in `src/example.ts`
 */

// Synchronous input/output example function
function basicInputOutputExample(input: number) {
	return input * input + Math.round(input - input * 5);
}

// Async input/output example function
async function asyncInputOutputExample(input: number) {
	// Waits 100ms to simulate async call
	await sleep(100);
	return basicInputOutputExample(input);
}

// Describe the function or behavior to test
describe('The basicInputOutputExample function', () => {
	// Define input
	const input = 42;

	// Define expectedOutput
	const expectedOutput = 1596;

	// Basic Mocha/Chai unit test example
	it('returns the expected output', () => {
		const actual = basicInputOutputExample(input);
		expect(actual).to.equal(expectedOutput);
	});

	// Asynchronous mocha/chai example
	it('asynchronously returns the expected output', async () => {
		const actual = await asyncInputOutputExample(input);

		// Returning anything to `it()` will conclude an async test
		return expect(actual).to.equal(expectedOutput);
	});

	// To more easily be used with Sinon, use test function inside of an object
	const objectWithExampleFunctions = { basicInputOutputExample };

	// Sinon spy example
	it('returns correct output when checked by Sinon spy', () => {
		// Setup spy
		const sinonSpy = spy(objectWithExampleFunctions, 'basicInputOutputExample');

		// Run test as normal
		const actual = objectWithExampleFunctions.basicInputOutputExample(input);
		expect(actual).to.equal(expectedOutput);

		// Verify spy calls with Chai
		expect(sinonSpy.calledWith(input)).to.be.ok;
		expect(sinonSpy.calledOnce).to.be.ok;
	});

	// Sinon stub example
	it('can be stubbed by a Sinon stub', () => {
		// Stub in a fake function
		stub(objectWithExampleFunctions, 'basicInputOutputExample').callsFake(() => 1337);

		const actual = objectWithExampleFunctions.basicInputOutputExample(input);

		// Verify stubbed output
		expect(actual).to.equal(1337);
	});

	// Sinon mock example
	it('can be used in a Sinon mock', () => {
		// Create mock
		const sinonMock = mock(objectWithExampleFunctions);

		// Setup mock expectations
		sinonMock.expects('basicInputOutputExample').once().returns(10101);

		const actual = objectWithExampleFunctions.basicInputOutputExample(input);

		// Confirm output with Chai
		expect(actual).to.equal(10101);

		// Verify mock expectations
		sinonMock.verify();
	});

	// Power-assert debugging example
	it('can provide detailed error output when used with the power-assert library', () => {
		// Comment out the regular Chai test
		// const output = basicInputOutputExample(input);
		// expect(output).to.equal(expectedOutput);

		// Put everything relevant inside a power-assert assertion
		// More info inside the assertion results in a more detailed output
		assert(basicInputOutputExample(input) === expectedOutput);

		/**
		 * This test has been left in a passing state because all tests must pass
		 * To view the detailed error output example, change above assertion to fail in some way
		 *
		 * For instance:
		 * assert(basicInputOutputExample(56) === expectedOutput);
		 * assert(basicInputOutputExample(input) !== expectedOutput);
		 *
		 * And then use: yarn power-assert -g 'power-assert'
		 */
	});
});
