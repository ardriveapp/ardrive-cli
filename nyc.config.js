'use-strict';

// Istanbul `nyc` configuration file

// Reference for config options: https://github.com/istanbuljs/nyc#common-configuration-options
// eslint-disable-next-line no-undef
module.exports = {
	extends: '@istanbuljs/nyc-config-typescript',
	extension: ['.ts'],
	include: ['src/**/*.ts'],
	exclude: ['**/*.d.ts', '**/*.test.ts'],
	all: true,
	// Reporter options: https://istanbul.js.org/docs/advanced/alternative-reporters/
	reporter: ['text-summary', 'html']

	// Coverage options (once we have some coverage)
	// 'check-coverage': true,
	// branches: 80,
	// lines: 80,
	// functions: 80,
	// statements: 80
};
