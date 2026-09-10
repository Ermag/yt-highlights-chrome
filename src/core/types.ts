/** Where a timestamp was found. Description entries outrank comment entries. */
export type HighlightSource = 'description' | 'comment';

/** One timestamp reference pulled from a single line of text, pre-merge. */
export interface RawEntry {
	readonly seconds: number;
	/** Cleaned label text. May be empty. */
	readonly label: string;
	readonly source: HighlightSource;
}

/** A merged highlight at one point in the video. */
export interface Highlight {
	readonly seconds: number;
	/** Canonical display timestamp, derived from `seconds` (e.g. `"1:02:03"`). */
	readonly stamp: string;
	/** Distinct labels, description-sourced first. May be empty. */
	readonly labels: readonly string[];
	/**
	 * Which text the timestamp was found in, description-first. `['comment']`
	 * alone means the label came only from a comment — the content layer uses
	 * that to make the controls label a link back to that comment.
	 */
	readonly sources: readonly HighlightSource[];
}

/** A run of highlights close enough together to render as one marker. */
export interface HighlightCluster {
	readonly seconds: number;
	readonly percent: number;
	readonly highlights: readonly Highlight[];
}
