/**
 * Jump from a highlight back to the comment its label came from.
 *
 * A highlight whose label came only from a comment (`sources` is exactly
 * `['comment']`) is offered as a link in the player controls. YouTube renders a
 * `1:23` in comment text as an `<a href="…&t=83s">`, so we find the thread by
 * that link, disambiguate by label text when several match, scroll it into view
 * and flash it. When the exact thread isn't in the DOM (not loaded, or the
 * timestamp wasn't linkified) we still bring the comments section into view.
 */
import { extractEntries, normalizeLabel, type Highlight } from '../core';
import { readElementText } from '../shared/dom-text';
import { SELECTORS, query, queryAll } from './dom';

/** How long the located comment stays highlighted. */
const FLASH_MS = 2000;

/** Returns `true` when the exact comment was found (not just the section). */
export function scrollToSourceComment(highlight: Highlight): boolean {
	const container = query<HTMLElement>(SELECTORS.comments);
	if (!container) return false;

	const thread = findThread(container, highlight);
	const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';

	if (thread) {
		thread.scrollIntoView?.({ behavior, block: 'center' });
		flash(thread);
		return true;
	}

	container.scrollIntoView?.({ behavior, block: 'start' });
	return false;
}

function findThread(container: HTMLElement, highlight: Highlight): HTMLElement | null {
	const threads = queryAll<HTMLElement>(SELECTORS.commentThread, container);
	const wantedLabel = normalizeLabel(highlight.labels[0] ?? '');

	const linksToStamp = (thread: HTMLElement): boolean =>
		highlight.seconds > 0 && query(`a[href*="t=${highlight.seconds}s"]`, thread) !== null;

	const mentionsHighlight = (thread: HTMLElement): boolean =>
		extractEntries(readElementText(query(SELECTORS.commentText, thread)), 'comment').some(
			(entry) =>
				entry.seconds === highlight.seconds &&
				(wantedLabel === '' || normalizeLabel(entry.label) === wantedLabel),
		);

	const linked = threads.filter(linksToStamp);
	return linked.find(mentionsHighlight) ?? linked[0] ?? threads.find(mentionsHighlight) ?? null;
}

function flash(thread: HTMLElement): void {
	thread.classList.add('ytph-comment-flash');
	setTimeout(() => thread.classList.remove('ytph-comment-flash'), FLASH_MS);
}

const prefersReducedMotion = (): boolean =>
	globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
