import { describe, expect, it } from 'vitest';
import { mergeEntries } from './dedupe';
import type { RawEntry } from './types';

const entry = (
	seconds: number,
	label: string,
	source: RawEntry['source'] = 'description',
): RawEntry => ({
	seconds,
	label,
	source,
});

describe('mergeEntries', () => {
	it('produces one highlight per distinct second, sorted', () => {
		const out = mergeEntries([entry(300, 'B'), entry(0, 'A'), entry(60, 'C')]);
		expect(out.map((h) => h.seconds)).toEqual([0, 60, 300]);
	});

	it('merges different spellings of the same second (v3 bug)', () => {
		const out = mergeEntries([entry(300, 'A'), entry(300, 'A')]);
		expect(out).toHaveLength(1);
		expect(out[0]?.stamp).toBe('5:00');
	});

	it('collapses labels that are equal after normalisation', () => {
		const out = mergeEntries([entry(0, 'Intro'), entry(0, 'intro!'), entry(0, 'INTRO')]);
		expect(out[0]?.labels).toEqual(['Intro']);
	});

	it('keeps genuinely different labels', () => {
		const out = mergeEntries([entry(0, 'Intro'), entry(0, 'Introduction')]);
		expect(out[0]?.labels).toEqual(['Intro', 'Introduction']);
	});

	it('orders description labels before comment labels', () => {
		const out = mergeEntries([
			entry(0, 'from comment', 'comment'),
			entry(0, 'from description'),
		]);
		expect(out[0]?.labels).toEqual(['from description', 'from comment']);
	});

	it('prefers the description spelling when both sources normalise equal', () => {
		const out = mergeEntries([
			entry(0, 'the intro', 'comment'),
			entry(0, 'The Intro', 'description'),
		]);
		expect(out[0]?.labels).toEqual(['The Intro']);
	});

	it('drops empty and punctuation-only labels, keeps [] when nothing is left', () => {
		expect(mergeEntries([entry(0, ''), entry(0, 'Real')])[0]?.labels).toEqual(['Real']);
		expect(mergeEntries([entry(90, ''), entry(90, '')])[0]?.labels).toEqual([]);
		expect(mergeEntries([entry(90, '...'), entry(90, '!!!')])[0]?.labels).toEqual([]);
	});

	it('keeps emoji-only and non-Latin labels', () => {
		expect(mergeEntries([entry(0, '😂😂😂')])[0]?.labels).toEqual(['😂😂😂']);
		expect(mergeEntries([entry(0, '这是介绍')])[0]?.labels).toEqual(['这是介绍']);
		// distinct emoji are not merged
		expect(mergeEntries([entry(0, '😂'), entry(0, '🔥')])[0]?.labels).toEqual(['😂', '🔥']);
	});

	it('derives the display stamp from seconds', () => {
		expect(mergeEntries([entry(5025, 'x')])[0]?.stamp).toBe('1:23:45');
	});
});
