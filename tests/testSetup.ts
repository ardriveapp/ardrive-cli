import { restore } from 'sinon';

// Restores the default sandbox after every test
exports.mochaHooks = {
	afterEach() {
		restore();
	}
};
