import { describe, expect, it } from 'vitest';
import { activeHighlight, nextHighlight, previousHighlight } from './navigate';
import type { Highlight } from './types';

const at = (seconds: number): Highlight => ({
	seconds,
	stamp: String(seconds),
	labels: [String(seconds)],
	sources: ['description'],
});
const list: readonly Highlight[] = [at(0), at(50), at(150), at(300)];

describe('nextHighlight', () => {
	it('returns the first highlight strictly after the playhead', () => {
		expect(nextHighlight(list, 100)?.seconds).toBe(150);
		expect(nextHighlight(list, 0)?.seconds).toBe(50);
		expect(nextHighlight(list, 150)?.seconds).toBe(300);
	});

	it('wraps to the first highlight past the last one', () => {
		expect(nextHighlight(list, 300)?.seconds).toBe(0);
		expect(nextHighlight(list, 9999)?.seconds).toBe(0);
	});

	it('is null only for an empty list', () => {
		expect(nextHighlight([], 0)).toBeNull();
	});
});

describe('previousHighlight', () => {
	it('returns the last highlight strictly before the playhead', () => {
		expect(previousHighlight(list, 160)?.seconds).toBe(150);
		expect(previousHighlight(list, 150)?.seconds).toBe(50);
	});

	it('wraps to the last highlight before the first one', () => {
		expect(previousHighlight(list, 0)?.seconds).toBe(300);
		expect(previousHighlight(list, -5)?.seconds).toBe(300);
	});

	it('is null only for an empty list', () => {
		expect(previousHighlight([], 100)).toBeNull();
	});
});

describe('activeHighlight', () => {
	it('returns the section currently playing', () => {
		expect(activeHighlight(list, 160)?.seconds).toBe(150);
		expect(activeHighlight(list, 50)?.seconds).toBe(50);
		expect(activeHighlight(list, 1000)?.seconds).toBe(300);
	});

	it('returns null before the first highlight', () => {
		// list starts at 0, so use a list that does not
		expect(activeHighlight([at(50), at(150)], 10)).toBeNull();
	});
});
