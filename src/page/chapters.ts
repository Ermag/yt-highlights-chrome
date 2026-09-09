/**
 * Whether YouTube is already surfacing its own chapter list for this video —
 * creator chapters derived from the description (first stamp `0:00`, 3+ ascending
 * stamps, segments ≥ 10s) or YouTube's ML-generated auto-chapters. When it is,
 * our description-sourced markers would only duplicate the native chapter
 * dividers, so the content script drops them.
 */

// The chapters engagement panel is server-rendered and stays in the DOM
// regardless of playback state. The progress-bar segments are not a reliable
// signal: they collapse to a single child during pre-roll ads and render lazily.
const CHAPTER_PANEL =
	'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"],' +
	'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-auto-chapters"]';

// Fallback: the segmented progress bar itself. One child spans the whole bar
// when there are no chapters; one child per chapter otherwise.
const PROGRESS_BAR_CHAPTERS = '#movie_player .ytp-progress-bar .ytp-chapters-container';

export function hasNativeChapters(): boolean {
	if (document.querySelector(CHAPTER_PANEL) !== null) return true;
	const container = document.querySelector(PROGRESS_BAR_CHAPTERS);
	return (container?.childElementCount ?? 0) > 1;
}
