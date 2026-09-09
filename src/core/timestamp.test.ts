import { describe, expect, it } from 'vitest';
import { formatSeconds, toSeconds } from './timestamp';

describe('toSeconds', () => {
	it('parses M:SS', () => {
		expect(toSeconds('0:00')).toBe(0);
		expect(toSeconds('5:03')).toBe(303);
		expect(toSeconds('10:00')).toBe(600);
		expect(toSeconds('59:59')).toBe(3599);
	});

	it('parses H:MM:SS', () => {
		expect(toSeconds('1:00:00')).toBe(3600);
		expect(toSeconds('1:23:45')).toBe(5025);
		expect(toSeconds('10:00:00')).toBe(36000);
	});

	it('is lenient about zero-padding', () => {
		expect(toSeconds('05:00')).toBe(300);
		expect(toSeconds('1:2:3')).toBe(3723);
		expect(toSeconds('00:00:05')).toBe(5);
	});

	it('rejects non-timestamps', () => {
		for (const bad of ['12', '', 'abc', ':30', '1:', '1::2', '1:2:3:4', 'https://a.b/1:23']) {
			expect(toSeconds(bad), bad).toBeNull();
		}
	});

	it('rejects out-of-range base-60 fields', () => {
		expect(toSeconds('1:60')).toBeNull();
		expect(toSeconds('1:99')).toBeNull();
		expect(toSeconds('1:70:00')).toBeNull();
		expect(toSeconds('1:00:99')).toBeNull();
	});

	it('allows a large leading field (minutes or hours)', () => {
		expect(toSeconds('100:00')).toBe(6000);
		expect(toSeconds('120:30')).toBe(7230);
	});
});

describe('formatSeconds', () => {
	it('formats M:SS below an hour', () => {
		expect(formatSeconds(0)).toBe('0:00');
		expect(formatSeconds(5)).toBe('0:05');
		expect(formatSeconds(303)).toBe('5:03');
		expect(formatSeconds(3599)).toBe('59:59');
	});

	it('formats H:MM:SS from an hour up', () => {
		expect(formatSeconds(3600)).toBe('1:00:00');
		expect(formatSeconds(3661)).toBe('1:01:01');
		expect(formatSeconds(5025)).toBe('1:23:45');
	});

	it('clamps negative / non-finite to 0:00', () => {
		expect(formatSeconds(-5)).toBe('0:00');
		expect(formatSeconds(Number.NaN)).toBe('0:00');
		expect(formatSeconds(Number.POSITIVE_INFINITY)).toBe('0:00');
	});

	it('floors fractional seconds', () => {
		expect(formatSeconds(303.9)).toBe('5:03');
	});
});

describe('round trip', () => {
	it('canonicalises any accepted spelling', () => {
		const norm = (s: string) => formatSeconds(toSeconds(s) ?? -1);
		expect(norm('05:00')).toBe('5:00');
		expect(norm('1:2:3')).toBe('1:02:03');
		expect(norm('00:05')).toBe('0:05');
	});
});
