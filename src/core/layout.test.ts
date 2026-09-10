import { describe, expect, it } from 'vitest';
import { clusterByProximity, positionPercent } from './layout';
import type { Highlight } from './types';

const at = (seconds: number): Highlight => ({
	seconds,
	stamp: String(seconds),
	labels: [],
	sources: ['description'],
});

describe('positionPercent', () => {
	it('maps seconds onto 0–100', () => {
		expect(positionPercent(0, 600)).toBe(0);
		expect(positionPercent(300, 600)).toBe(50);
		expect(positionPercent(600, 600)).toBe(100);
	});

	it('clamps out-of-range input', () => {
		expect(positionPercent(700, 600)).toBe(100);
		expect(positionPercent(-10, 600)).toBe(0);
	});

	it('returns 0 for unknown / invalid duration', () => {
		expect(positionPercent(300, 0)).toBe(0);
		expect(positionPercent(300, -1)).toBe(0);
		expect(positionPercent(Number.NaN, 600)).toBe(0);
	});
});

describe('clusterByProximity', () => {
	it('groups highlights closer than the minimum gap', () => {
		const clusters = clusterByProximity([at(0), at(3), at(300)], 600, 1);
		expect(clusters).toHaveLength(2);
		expect(clusters[0]?.highlights.map((h) => h.seconds)).toEqual([0, 3]);
		expect(clusters[1]?.highlights.map((h) => h.seconds)).toEqual([300]);
	});

	it('anchors each cluster at its first highlight', () => {
		const [first] = clusterByProximity([at(6), at(9)], 600, 5);
		expect(first?.seconds).toBe(6);
		expect(first?.percent).toBe(1);
	});

	it('keeps everything separate when spread out', () => {
		expect(clusterByProximity([at(60), at(180), at(420)], 600, 1)).toHaveLength(3);
	});

	it('handles the empty case', () => {
		expect(clusterByProximity([], 600)).toEqual([]);
	});
});
