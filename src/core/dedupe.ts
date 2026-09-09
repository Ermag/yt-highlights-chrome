/**
 * Merge raw entries into highlights: one highlight per distinct second, with a
 * de-duplicated, source-ordered label list. Pure, DOM-free.
 *
 * Label de-duplication is exact after normalisation (case folded, punctuation and
 * whitespace removed) — predictable, unlike v3's fuzzy Levenshtein merge.
 * `"Intro"`, `"intro"` and `"Intro!"` collapse; `"Intro"` and `"Introduction"` do
 * not. Letters of any script, digits and emoji are kept, so a `"😂😂😂"` or a
 * non-Latin label survives.
 */
import { formatSeconds } from './timestamp';
import type { Highlight, HighlightSource, RawEntry } from './types';

const NON_MEANINGFUL = /[^\p{L}\p{N}\p{Extended_Pictographic}]+/gu;
const normalize = (label: string): string => label.toLowerCase().replace(NON_MEANINGFUL, '');

const uniqueBy = <T>(items: readonly T[], key: (item: T) => string): readonly T[] => {
	const keys = items.map(key);
	return items.filter((_, index) => keys.indexOf(keys[index] ?? '') === index);
};

function distinctLabels(entries: readonly RawEntry[]): readonly string[] {
	const bySource = (source: HighlightSource): readonly string[] =>
		entries.filter((entry) => entry.source === source).map((entry) => entry.label);

	const ordered = [...bySource('description'), ...bySource('comment')].filter(
		(label) => label.length > 0,
	);
	return uniqueBy(ordered, normalize).filter((label) => normalize(label).length > 0);
}

/** Merge entries into highlights, sorted ascending by time. */
export function mergeEntries(entries: readonly RawEntry[]): readonly Highlight[] {
	const seconds = [...new Set(entries.map((entry) => entry.seconds))];
	return seconds
		.map((second) => ({
			seconds: second,
			stamp: formatSeconds(second),
			labels: distinctLabels(entries.filter((entry) => entry.seconds === second)),
		}))
		.toSorted((a, b) => a.seconds - b.seconds);
}
