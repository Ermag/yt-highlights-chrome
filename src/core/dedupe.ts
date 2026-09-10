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

/** Fold a label to its meaningful characters for equality checks (case, spacing
 *  and punctuation removed). Exported so the content layer can match a highlight
 *  label back to the comment line it came from. */
export const normalizeLabel = (label: string): string =>
	label.toLowerCase().replace(NON_MEANINGFUL, '');

const normalize = normalizeLabel;

const uniqueBy = <T>(items: readonly T[], key: (item: T) => string): readonly T[] => {
	const keys = items.map(key);
	return items.filter((_, index) => keys.indexOf(keys[index] ?? '') === index);
};

const SOURCE_ORDER: readonly HighlightSource[] = ['description', 'comment'];

function distinctLabels(entries: readonly RawEntry[]): readonly string[] {
	const bySource = (source: HighlightSource): readonly string[] =>
		entries.filter((entry) => entry.source === source).map((entry) => entry.label);

	const ordered = [...bySource('description'), ...bySource('comment')].filter(
		(label) => label.length > 0,
	);
	return uniqueBy(ordered, normalize).filter((label) => normalize(label).length > 0);
}

/** The sources that carried this second's timestamp, description before comment. */
const distinctSources = (entries: readonly RawEntry[]): readonly HighlightSource[] =>
	SOURCE_ORDER.filter((source) => entries.some((entry) => entry.source === source));

/** Merge entries into highlights, sorted ascending by time. */
export function mergeEntries(entries: readonly RawEntry[]): readonly Highlight[] {
	const seconds = [...new Set(entries.map((entry) => entry.seconds))];
	return seconds
		.map((second) => {
			const atSecond = entries.filter((entry) => entry.seconds === second);
			return {
				seconds: second,
				stamp: formatSeconds(second),
				labels: distinctLabels(atSecond),
				sources: distinctSources(atSecond),
			};
		})
		.toSorted((a, b) => a.seconds - b.seconds);
}
