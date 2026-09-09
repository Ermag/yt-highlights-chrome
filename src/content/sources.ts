/**
 * Reads the top-level comments from the DOM. They are lazy-loaded, so we nudge
 * them into loading off-screen and wait for the count to settle.
 *
 * (The description is read by the MAIN-world bridge — see src/page/description.ts
 * — because its `textContent` is truncated in the collapsed state.)
 */
import { waitFor, waitForStableCount } from '../shared/async';
import { readElementText } from '../shared/dom-text';
import { SELECTORS, query, queryAll, waitForElement } from './dom';

const MAX_COMMENTS = 60;
const STABLE_CHECKS = 4;
const CHECK_INTERVAL_MS = 250;

export async function readComments(signal: AbortSignal): Promise<readonly string[]> {
	return readCommentsOrThrow(signal).catch(() => [] as readonly string[]);
}

async function readCommentsOrThrow(signal: AbortSignal): Promise<readonly string[]> {
	const container = await waitForElement<HTMLElement>(SELECTORS.comments, {
		signal,
		timeoutMs: 15_000,
	});

	const restore = nudgeIntoLoading(container);
	try {
		await waitFor(() => (countThreads(container) > 0 ? true : null), {
			signal,
			intervalMs: CHECK_INTERVAL_MS,
			timeoutMs: 12_000,
		});
		await waitForStableCount(() => countThreads(container), {
			signal,
			minCount: 1,
			stableChecks: STABLE_CHECKS,
			intervalMs: CHECK_INTERVAL_MS,
			timeoutMs: 12_000,
		});
	} catch {
		// Comments disabled / never loaded — fall through with whatever is present.
	} finally {
		restore();
	}

	return queryAll(SELECTORS.commentThread, container)
		.slice(0, MAX_COMMENTS)
		.map((thread) => readElementText(query(SELECTORS.commentText, thread)))
		.filter((text) => text.length > 0);
}

const countThreads = (container: ParentNode): number =>
	container.querySelectorAll(SELECTORS.commentThread).length;

/**
 * Pull the comments section into the viewport (invisibly) so YouTube's
 * intersection-driven lazy loader kicks in, then restore the original style.
 */
function nudgeIntoLoading(container: HTMLElement): () => void {
	const previous = container.getAttribute('style');
	container.setAttribute(
		'style',
		'position: absolute; top: 0; left: 0; width: 1px; height: 1px; visibility: hidden;',
	);
	window.dispatchEvent(new Event('scroll'));
	return () => {
		if (previous === null) container.removeAttribute('style');
		else container.setAttribute('style', previous);
	};
}
