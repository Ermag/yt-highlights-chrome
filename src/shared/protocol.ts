/**
 * Message bus between the two execution worlds:
 *   src/page    (MAIN, document_start)  <->  src/content (ISOLATED, document_end)
 *
 * The worlds can't share JS references, so messages cross as a JSON **string**
 * in a namespaced `CustomEvent.detail` on `document` — the one payload shape that
 * is guaranteed to survive the world boundary in every Chrome version.
 */

const PAGE_TO_CONTENT = 'ytph:page';
const CONTENT_TO_PAGE = 'ytph:content';

export interface PlayerState {
	readonly videoId: string;
	/** Video length in seconds. `0` means unknown or live. */
	readonly durationSeconds: number;
	readonly isLive: boolean;
	/** Full description text (only the MAIN world can read it un-truncated). */
	readonly description: string;
	/** YouTube already shows chapters for this video (so we skip the description). */
	readonly hasNativeChapters: boolean;
}

/** MAIN -> ISOLATED. */
export type PageMessage =
	| { readonly kind: 'player-state'; readonly state: PlayerState }
	| { readonly kind: 'player-gone' };

/** ISOLATED -> MAIN. */
export type ContentMessage =
	{ readonly kind: 'query-player' } | { readonly kind: 'seek'; readonly seconds: number };

function publish(eventName: string, message: unknown): void {
	document.dispatchEvent(new CustomEvent(eventName, { detail: JSON.stringify(message) }));
}

function subscribe<T>(eventName: string, handler: (message: T) => void): () => void {
	const listener = (event: Event): void => {
		const { detail } = event as CustomEvent<unknown>;
		if (typeof detail !== 'string') return;
		try {
			handler(JSON.parse(detail) as T);
		} catch {
			// Ignore malformed cross-world traffic (e.g. the page spoofing our events).
			return;
		}
	};
	document.addEventListener(eventName, listener);
	return () => {
		document.removeEventListener(eventName, listener);
	};
}

export const sendToContent = (message: PageMessage): void => {
	publish(PAGE_TO_CONTENT, message);
};
export const sendToPage = (message: ContentMessage): void => {
	publish(CONTENT_TO_PAGE, message);
};
export const onPageMessage = (handler: (message: PageMessage) => void): (() => void) =>
	subscribe(PAGE_TO_CONTENT, handler);
export const onContentMessage = (handler: (message: ContentMessage) => void): (() => void) =>
	subscribe(CONTENT_TO_PAGE, handler);
