/**
 * Page bridge — MAIN world, injected at `document_start`.
 *
 * The only code that touches YouTube's internals. Answers `query-player`,
 * performs `seek`, and pushes a fresh {@link PlayerState} whenever the SPA swaps
 * videos or the media element reports new metadata. Never touches the
 * extension's own UI — that is the content script's job.
 */
import { onContentMessage, sendToContent } from '../shared/protocol';
import { readPlayerState, seek } from './player';

function pushPlayerState(): void {
	const state = readPlayerState();
	sendToContent(state ? { kind: 'player-state', state } : { kind: 'player-gone' });
}

onContentMessage((message) => {
	switch (message.kind) {
		case 'query-player':
			pushPlayerState();
			break;
		case 'seek':
			seek(message.seconds);
			break;
	}
});

// YouTube is a SPA: the player data and the <video> element change with no reload.
// `loadedmetadata` / `durationchange` don't bubble, so listen in the capture phase.
document.addEventListener('yt-navigate-finish', pushPlayerState);
document.addEventListener('loadedmetadata', pushPlayerState, true);
document.addEventListener('durationchange', pushPlayerState, true);

console.debug('[ytph] page bridge ready');
