import { describe, expect, it } from 'vitest';
import { cleanLabel, extractEntries } from './parse';
import type { RawEntry } from './types';

const desc = (text: string): readonly RawEntry[] => extractEntries(text, 'description');

describe('cleanLabel', () => {
	it('trims surrounding punctuation and whitespace', () => {
		expect(cleanLabel('  - Introduction  ')).toBe('Introduction');
		expect(cleanLabel('[Introduction]')).toBe('Introduction');
		expect(cleanLabel('• Introduction')).toBe('Introduction');
		expect(cleanLabel('— Introduction —')).toBe('Introduction');
	});

	it('keeps sentence punctuation inside the label', () => {
		expect(cleanLabel('What is AI? A primer')).toBe('What is AI? A primer');
	});

	it('strips URLs', () => {
		expect(cleanLabel('Intro https://example.com/x')).toBe('Intro');
		expect(cleanLabel('Intro www.example.com')).toBe('Intro');
	});

	it('collapses inner whitespace', () => {
		expect(cleanLabel('a\t  b   c')).toBe('a b c');
	});

	it('caps a rambling comment to a usable prefix', () => {
		const essay = `A${'x'.repeat(400)}`;
		const out = cleanLabel(essay);
		expect(out.length).toBe(250);
		expect(out.endsWith('…')).toBe(true);
	});

	it('leaves a long but reasonable comment sentence intact', () => {
		const sentence =
			'I really think that, the government sidelines gold and silver, just to print more of paper cash, while trying so hard to get control or power over gold, and then open the market for it';
		expect(sentence.length).toBeLessThan(250);
		expect(cleanLabel(sentence)).toBe(sentence);
	});

	it('leaves a normal-length label untouched', () => {
		const label = 'Crisis of the Third Century and the road to Diocletian';
		expect(cleanLabel(label)).toBe(label);
	});

	it('keeps emoji', () => {
		expect(cleanLabel('😂😂😂')).toBe('😂😂😂');
		expect(cleanLabel('  🔥 best part 🔥  ')).toBe('🔥 best part 🔥');
	});
});

describe('extractEntries', () => {
	it('reads "stamp label"', () => {
		expect(desc('0:00 Introduction')).toEqual([
			{ seconds: 0, label: 'Introduction', source: 'description' },
		]);
	});

	it('reads "label stamp"', () => {
		expect(desc('Introduction 0:00')).toEqual([
			{ seconds: 0, label: 'Introduction', source: 'description' },
		]);
	});

	it('drops the separator with no leading space (v3 bug)', () => {
		expect(desc('0:00 - Introduction')[0]?.label).toBe('Introduction');
		expect(desc('0:00 — Introduction')[0]?.label).toBe('Introduction');
		expect(desc('[0:00] Introduction')[0]?.label).toBe('Introduction');
	});

	it('handles one entry per line across many lines', () => {
		const out = desc('0:00 Intro\n5:00 Middle\n1:00:00 End');
		expect(out.map((e) => e.seconds)).toEqual([0, 300, 3600]);
		expect(out.map((e) => e.label)).toEqual(['Intro', 'Middle', 'End']);
	});

	it('ignores lines without a timestamp', () => {
		expect(desc('watch my other videos\nsubscribe here')).toEqual([]);
	});

	it('keeps only the start of a leading range', () => {
		expect(desc('0:00 - 0:30 Cold open')).toEqual([
			{ seconds: 0, label: 'Cold open', source: 'description' },
		]);
		expect(desc('0:00–0:30 Cold open').map((e) => e.seconds)).toEqual([0]);
	});

	it('shares a label across unrelated stamps on one line', () => {
		const out = desc('0:00 a 5:00 b');
		expect(out.map((e) => e.seconds)).toEqual([0, 300]);
		expect(new Set(out.map((e) => e.label))).toEqual(new Set(['a b']));
	});

	it('does not match numbers glued to other digits/colons', () => {
		expect(desc('bitrate 1234:56 kbps')).toEqual([]);
		expect(desc('ratio 2:3:4:5')).toEqual([]);
	});

	it('yields the same second from different spellings (merged later)', () => {
		const out = desc('05:00 A\n5:00 B');
		expect(out.map((e) => e.seconds)).toEqual([300, 300]);
	});

	it('treats label text as opaque data, never markup', () => {
		const out = desc('0:00 <img src=x onerror=alert(1)>');
		expect(out).toHaveLength(1);
		expect(typeof out[0]?.label).toBe('string');
		expect(out[0]?.label).toContain('onerror');
	});

	it('tags the source', () => {
		expect(extractEntries('0:00 x', 'comment')[0]?.source).toBe('comment');
	});

	it('keeps an emoji-only label', () => {
		expect(extractEntries('3:30 😂😂😂', 'comment')).toEqual([
			{ seconds: 210, label: '😂😂😂', source: 'comment' },
		]);
	});
});
