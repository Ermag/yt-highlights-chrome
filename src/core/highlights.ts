/**
 * Top-level pure builder: raw text in, sorted `Highlight[]` out.
 *
 * Unlike v3 this needs *either* a description *or* comments (not both), drops
 * timestamps past the video's end, and keys on seconds so `5:00` / `05:00` merge.
 */
import { mergeEntries } from './dedupe';
import { extractEntries } from './parse';
import type { Highlight } from './types';

export interface HighlightInput {
	readonly description?: string;
	readonly comments?: readonly string[];
	/** Video length in seconds. `<= 0` means unknown — skips the upper-bound filter. */
	readonly durationSeconds?: number;
	/** Safety cap against spam timestamp lists. Earliest are kept. */
	readonly maxHighlights?: number;
}

export function buildHighlights(input: HighlightInput): readonly Highlight[] {
	const { description = '', comments = [], durationSeconds = 0, maxHighlights = 100 } = input;

	const withinVideo = (seconds: number): boolean =>
		seconds >= 0 && (durationSeconds <= 0 || seconds <= durationSeconds);

	const entries = [
		...extractEntries(description, 'description'),
		...comments.flatMap((comment) => extractEntries(comment, 'comment')),
	].filter((entry) => withinVideo(entry.seconds));

	const highlights = mergeEntries(entries);
	return highlights.length > maxHighlights ? highlights.slice(0, maxHighlights) : highlights;
}
