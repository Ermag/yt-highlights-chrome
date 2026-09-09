import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import functional from 'eslint-plugin-functional';

export default tseslint.config(
	{
		ignores: [
			'dist/',
			'node_modules/',
			// local dev/test aids — out of source control, not shipped
			'dev/',
			// shared test doubles — type-checked, not linted
			'src/test-support/',
		],
	},

	js.configs.recommended,

	// Type-aware linting for all TypeScript sources, tests included.
	{
		files: ['src/**/*.ts'],
		extends: [...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'no-var': 'error',
			'prefer-const': 'error',
			'no-param-reassign': 'error',
			'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
			'no-empty': ['error', { allowEmptyCatch: true }],
		},
	},

	// Functional-programming guardrails for the pure layer (src/core, src/shared).
	// src/content and src/page are the imperative DOM shell — kept thin, but not
	// held to no-mutation / no-let.
	{
		files: ['src/**/*.ts'],
		ignores: ['src/**/*.test.ts', 'src/**/*.fixtures.ts', 'src/content/**', 'src/page/**'],
		plugins: { functional },
		rules: {
			'functional/no-let': ['warn', { allowInForLoopInit: true }],
			'functional/immutable-data': ['warn', { ignoreClasses: true }],
			'functional/prefer-tacit': 'off',
			'functional/prefer-immutable-types': 'off',
			'functional/no-loop-statements': 'off',
			'functional/no-expression-statements': 'off',
			'functional/no-return-void': 'off',
		},
	},

	// Build/config scripts: plain Node ESM, no type-aware rules.
	{
		files: ['scripts/**/*.mjs', 'eslint.config.js', 'vitest.config.ts'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: {
			globals: {
				process: 'readonly',
				console: 'readonly',
			},
		},
		rules: {
			'no-console': 'off',
		},
	},
);
