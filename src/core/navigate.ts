/**
 * Selecting a highlight relative to the playhead. Pure.
 * All functions assume `highlights` is sorted ascending by `seconds`
 * (as returned by `buildHighlights` / `mergeEntries`).
 */
import type { Highlight } from './types';

/** The highlight whose section is currently playing (last at or before `atSeconds`). */
export function activeHighlight(
	highlights: readonly Highlight[],
	atSeconds: number,
): Highlight | null {
	return highlights.filter((highlight) => highlight.seconds <= atSeconds).at(-1) ?? null;
}

/**
 * First highlight after `atSeconds`, wrapping to the first highlight when there
 * is none ahead. `null` only when the list is empty.
 */
export function nextHighlight(
	highlights: readonly Highlight[],
	atSeconds: number,
): Highlight | null {
	if (highlights.length === 0) return null;
	return highlights.find((highlight) => highlight.seconds > atSeconds) ?? highlights[0] ?? null;
}

/**
 * Last highlight before `atSeconds`, wrapping to the last highlight when there is
 * none behind. `null` only when the list is empty.
 */
export function previousHighlight(
	highlights: readonly Highlight[],
	atSeconds: number,
): Highlight | null {
	if (highlights.length === 0) return null;
	return (
		highlights.filter((highlight) => highlight.seconds < atSeconds).at(-1) ??
		highlights.at(-1) ??
		null
	);
}
