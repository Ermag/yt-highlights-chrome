/**
 * The full description text. MAIN world only: the rendered
 * `#description-inline-expander` exposes the complete text on its Polymer `.text`
 * property, while its `textContent` is truncated in the collapsed state.
 */
import { readElementText } from '../shared/dom-text';

interface DescriptionExpander extends Element {
	readonly text?: { readonly content?: string };
}

interface PlayerResponse {
	readonly videoDetails?: {
		readonly videoId?: string;
		readonly shortDescription?: string;
	};
}

const SELECTOR = '#description-inline-expander, #description ytd-text-inline-expander';

export function readDescription(videoId: string): string {
	const expander = document.querySelector<DescriptionExpander>(SELECTOR);

	const fromProperty = expander?.text?.content?.trim();
	if (fromProperty) return fromProperty;

	const initial = (window as { ytInitialPlayerResponse?: PlayerResponse })
		.ytInitialPlayerResponse;
	if (initial?.videoDetails?.videoId === videoId && initial.videoDetails.shortDescription) {
		return initial.videoDetails.shortDescription.trim();
	}

	return readElementText(expander);
}
