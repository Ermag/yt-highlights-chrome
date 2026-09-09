/**
 * Extract `{ seconds, label }` entries from free text (a description or one
 * comment). Pure, DOM-free — the returned labels are plain strings and are never
 * interpreted as markup anywhere downstream.
 */
import { toSeconds } from './timestamp';
import type { HighlightSource, RawEntry } from './types';

/** A `1:23` / `1:23:45` token not glued to other digits or colons. */
const TIMESTAMP_TOKEN = /(?<![\d:])\d{1,3}(?::\d{1,2}){1,2}(?![\d:])/g;

/** Text between two stamps that marks them as a range (`0:00 - 0:30 …`). */
const RANGE_SEPARATOR = /^\s*(?:-|–|—|~|to)\s*$/i;

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const LEADING_JUNK = /^[\s\-–—•·|:;,.*_()[\]{}<>"'`]+/;
const TRAILING_JUNK = /[\s\-–—•·|:;,*_()[\]{}<>"'`]+$/;

/** Comment-sourced labels are often a full sentence or two, so the cap is
 *  generous — it only exists to trim a whole comment that happens to wrap onto
 *  the timestamp line (walls of text, spam). The tooltip wraps and scrolls. */
const MAX_LABEL_LENGTH = 250;

interface Match {
	readonly seconds: number;
	readonly start: number;
	readonly end: number;
}

/** Strip URLs and surrounding punctuation/whitespace from a candidate label,
 *  then cap its length. */
export function cleanLabel(raw: string): string {
	const withoutUrls = raw.replace(URL_PATTERN, ' ').replace(/\s+/g, ' ').trim();
	const cleaned = withoutUrls.replace(LEADING_JUNK, '').replace(TRAILING_JUNK, '').trim();
	return truncate(cleaned, MAX_LABEL_LENGTH);
}

/** Trim to `max` code points (never splitting an emoji), with an ellipsis. */
function truncate(text: string, max: number): string {
	const chars = [...text];
	if (chars.length <= max) return text;
	const head = chars
		.slice(0, max - 1)
		.join('')
		.trimEnd();
	return `${head}…`;
}

function findTimestamps(line: string): readonly Match[] {
	return [...line.matchAll(TIMESTAMP_TOKEN)].flatMap((match) => {
		const seconds = toSeconds(match[0]);
		const start = match.index ?? 0;
		return seconds === null ? [] : [{ seconds, start, end: start + match[0].length }];
	});
}

const stripTimestamps = (line: string, matches: readonly Match[]): string =>
	matches.reduceRight((text, match) => text.slice(0, match.start) + text.slice(match.end), line);

/**
 * All timestamp entries in `text`, in reading order.
 *
 * - One entry per distinct second per line.
 * - A leading `A - B` range keeps only `A`.
 * - A line with several unrelated stamps shares one label (rare; the common
 *   one-per-line form is always exact).
 */
export function extractEntries(text: string, source: HighlightSource): readonly RawEntry[] {
	return text.split(/\r?\n/).flatMap((line) => {
		const matches = findTimestamps(line);
		if (matches.length === 0) return [];

		const [first, second] = matches;
		const effective =
			matches.length === 2 &&
			first &&
			second &&
			RANGE_SEPARATOR.test(line.slice(first.end, second.start))
				? [first]
				: matches;

		const label = cleanLabel(stripTimestamps(line, matches));
		const uniqueSeconds = [...new Set(effective.map((match) => match.seconds))];
		return uniqueSeconds.map((seconds) => ({ seconds, label, source }));
	});
}
