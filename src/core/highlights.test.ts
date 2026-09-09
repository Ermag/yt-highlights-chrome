import { describe, expect, it } from 'vitest';
import { buildHighlights } from './highlights';

describe('buildHighlights', () => {
	it('works from the description alone (v3 required comments too)', () => {
		const out = buildHighlights({ description: '0:00 Intro\n5:00 Part two' });
		expect(out.map((h) => h.seconds)).toEqual([0, 300]);
	});

	it('works from comments alone (v3 required a description too)', () => {
		const out = buildHighlights({ comments: ['0:00 Intro', 'skip to 5:00 for the good bit'] });
		expect(out.map((h) => h.seconds)).toEqual([0, 300]);
	});

	it('returns nothing when there is no timestamped text', () => {
		expect(
			buildHighlights({ description: 'like and subscribe', comments: ['great video'] }),
		).toEqual([]);
	});

	it('drops timestamps past the end of the video (v3 bug)', () => {
		const out = buildHighlights({
			description: '0:00 Intro\n2:00:00 bogus',
			durationSeconds: 600,
		});
		expect(out.map((h) => h.seconds)).toEqual([0]);
	});

	it('keeps a timestamp exactly at the end, and skips the filter when duration is unknown', () => {
		expect(
			buildHighlights({ description: '10:00 End', durationSeconds: 600 }).map(
				(h) => h.seconds,
			),
		).toEqual([600]);
		expect(
			buildHighlights({ description: '2:00:00 Late', durationSeconds: 0 }).map(
				(h) => h.seconds,
			),
		).toEqual([7200]);
	});

	it('merges description and comments, keyed on seconds', () => {
		const out = buildHighlights({
			description: '5:00 Chapter',
			comments: ['05:00 chapter', '5:00 CHAPTER!!!'],
		});
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ seconds: 300, stamp: '5:00', labels: ['Chapter'] });
	});

	it('caps runaway timestamp spam, keeping the earliest', () => {
		const spam = Array.from({ length: 250 }, (_, i) => `${i}:00 marker ${i}`).join('\n');
		const out = buildHighlights({ description: spam, maxHighlights: 100 });
		expect(out).toHaveLength(100);
		expect(out[0]?.seconds).toBe(0);
		expect(out.at(-1)?.seconds).toBe(99 * 60);
	});

	it('parses a realistic multi-line description block', () => {
		const description = [
			'Thanks for watching! Sponsors: https://example.com/sponsors',
			'',
			'Timestamps:',
			'0:00 - Introduction',
			'2:56 Programming with AI agents',
			'18:14 How software will change',
			'1:00:06 Long-form deep dive',
			'',
			'Follow me: www.example.com',
		].join('\n');
		const out = buildHighlights({ description, durationSeconds: 5 * 3600 });
		expect(out.map((h) => h.stamp)).toEqual(['0:00', '2:56', '18:14', '1:00:06']);
		expect(out.map((h) => h.labels[0])).toEqual([
			'Introduction',
			'Programming with AI agents',
			'How software will change',
			'Long-form deep dive',
		]);
	});
});
