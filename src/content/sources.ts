/**
 * Follows the top-level comments in the DOM. They are lazy-loaded, so we nudge
 * them into loading off-screen, wait for the first batch to settle, and then keep
 * watching: comments that arrive late (slow network, or only once the user
 * scrolls) still feed the highlights instead of being missed for good.
 *
 * (The description is read by the MAIN-world bridge — see src/page/description.ts
 * — because its `textContent` is truncated in the collapsed state.)
 */
import { debounce, waitFor, waitForStableCount } from '../shared/async';
import { readElementText } from '../shared/dom-text';
import { SELECTORS, query, queryAll, waitForElement } from './dom';

const MAX_COMMENTS = 60;
const STABLE_CHECKS = 4;
const CHECK_INTERVAL_MS = 250;
const CHANGE_DEBOUNCE_MS = 400;

/**
 * Calls `onChange` with the current comment texts once the first batch has
 * settled (or failed to load), then again whenever they change, until `signal`
 * aborts. Never calls it twice with the same list.
 */
export function watchComments(
	signal: AbortSignal,
	onChange: (comments: readonly string[]) => void,
): void {
	void (async () => {
		const container = await waitForElement<HTMLElement>(SELECTORS.comments, {
			signal,
			timeoutMs: 15_000,
		}).catch(() => null);
		if (!container || signal.aborted) return;

		let lastKey = '[]';
		let settled = false;
		const emit = (): void => {
			if (signal.aborted) return;
			const comments = readThreads(container);
			const key = JSON.stringify(comments);
			if (key === lastKey) return;
			lastKey = key;
			onChange(comments);
		};

		// Until the first batch settles, mutations are just the batch streaming in.
		const emitSoon = debounce(emit, CHANGE_DEBOUNCE_MS);
		const observer = new MutationObserver(() => {
			if (settled) emitSoon();
		});
		observer.observe(container, { childList: true, subtree: true, characterData: true });
		signal.addEventListener(
			'abort',
			() => {
				observer.disconnect();
				emitSoon.cancel();
			},
			{ once: true },
		);

		await settleFirstBatch(container, signal);
		settled = true;
		emit();
	})();
}

async function settleFirstBatch(container: HTMLElement, signal: AbortSignal): Promise<void> {
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
		// Comments disabled / not loaded yet / aborted — the observer picks up the rest.
	} finally {
		restore();
	}
}

const readThreads = (container: ParentNode): readonly string[] =>
	queryAll(SELECTORS.commentThread, container)
		.slice(0, MAX_COMMENTS)
		.map((thread) => readElementText(query(SELECTORS.commentText, thread)))
		.filter((text) => text.length > 0);

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
