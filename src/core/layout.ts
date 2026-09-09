/**
 * Turning times into progress-bar positions. Pure — no pixels, no DOM.
 * The renderer maps percent -> px and handles marker width.
 */
import type { Highlight, HighlightCluster } from './types';

/** Position of `seconds` along the progress bar, as a percentage clamped to 0–100. */
export function positionPercent(seconds: number, durationSeconds: number): number {
	if (!(durationSeconds > 0) || !Number.isFinite(seconds)) return 0;
	return Math.min(100, Math.max(0, (seconds / durationSeconds) * 100));
}

/**
 * Group highlights whose positions are within `minGapPercent` of each other, so
 * near-coincident timestamps render as a single marker. Input must be sorted.
 */
export function clusterByProximity(
	highlights: readonly Highlight[],
	durationSeconds: number,
	minGapPercent = 1,
): readonly HighlightCluster[] {
	return highlights.reduce<readonly HighlightCluster[]>((clusters, highlight) => {
		const percent = positionPercent(highlight.seconds, durationSeconds);
		const last = clusters.at(-1);

		if (last && percent - last.percent < minGapPercent) {
			const merged: HighlightCluster = {
				...last,
				highlights: [...last.highlights, highlight],
			};
			return [...clusters.slice(0, -1), merged];
		}

		return [...clusters, { seconds: highlight.seconds, percent, highlights: [highlight] }];
	}, []);
}
