'use-strict';

process.env.NODE_ENV = 'test';

// Mocha configuration file
// Reference for options: https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js
module.exports = {
	extension: ['ts'],
	spec: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
	require: ['ts-node/register/transpile-only', 'source-map-support/register', 'tests/testSetup.ts'],
	timeout: '3000',
	parallel: true,
	recursive: true
};
