/**
 * The full description text. MAIN world only.
 *
 * Preferred source is the player's own response for the current video — keyed by
 * video id, so it can't be stale. The rendered `#description-inline-expander`
 * exposes the complete text on its Polymer `.text` property (its `textContent`
 * is truncated when collapsed), but it lags SPA navigations, so it is only read
 * once the page has caught up (see watch-page.ts).
 */
import { readElementText } from '../shared/dom-text';

interface DescriptionExpander extends Element {
	readonly text?: { readonly content?: string };
}

export interface PlayerResponse {
	readonly videoDetails?: {
		readonly videoId?: string;
		readonly shortDescription?: string;
		readonly lengthSeconds?: string;
	};
}

export interface DescriptionSources {
	/** `#movie_player.getPlayerResponse()` — the current video's response. */
	readonly playerResponse?: PlayerResponse | null | undefined;
	/** The rendered description panel belongs to `videoId` (see watch-page.ts). */
	readonly pageReady?: boolean;
}

const SELECTOR = '#description-inline-expander, #description ytd-text-inline-expander';

export function readDescription(videoId: string, sources: DescriptionSources = {}): string {
	const fromPlayer = shortDescriptionFor(sources.playerResponse, videoId);
	if (fromPlayer) return fromPlayer;

	const initial = (window as { ytInitialPlayerResponse?: PlayerResponse })
		.ytInitialPlayerResponse;
	const fromInitial = shortDescriptionFor(initial, videoId);
	if (fromInitial) return fromInitial;

	if (sources.pageReady === false) return '';

	const expander = document.querySelector<DescriptionExpander>(SELECTOR);
	return expander?.text?.content?.trim() || readElementText(expander);
}

function shortDescriptionFor(
	response: PlayerResponse | null | undefined,
	videoId: string,
): string | undefined {
	const details = response?.videoDetails;
	return details?.videoId === videoId ? details.shortDescription?.trim() || undefined : undefined;
}
