import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		// The pure core (src/core) is DOM-free and runs under Node. DOM-touching
		// suites opt in per-file with:  // @vitest-environment jsdom
		environment: 'node',
	},
});
