'use-strict';

process.env.NODE_ENV = 'test';

// Mocha configuration file
// Reference for options: https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js
module.exports = {
	extension: ['ts'],
	spec: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
	require: ['ts-node/register/transpile-only', 'source-map-support/register', 'tests/testSetup.ts'],
	// Node 22.18+ and 24 run .ts files themselves, as ES modules, before ts-node can
	// compile them as CommonJS; the tests are written for ts-node.
	'node-option': ['no-experimental-strip-types'],
	timeout: '3000',
	parallel: true,
	recursive: true
};
