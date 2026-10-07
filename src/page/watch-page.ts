/**
 * Whether the watch page's metadata DOM belongs to `videoId` yet. On an SPA
 * navigation the player reports the new video ~1s before YouTube swaps the
 * description panel, chapter panels and comments, and `ytd-watch-flexy` flips
 * its `video-id` attribute in the same update — so it is the tell.
 *
 * Unknown (no flexy, no attribute) counts as ready: better a rare stale read
 * than never rendering if YouTube renames the attribute.
 */
export function isWatchPageReady(videoId: string): boolean {
	const pageVideoId = document.querySelector('ytd-watch-flexy')?.getAttribute('video-id');
	return !pageVideoId || pageVideoId === videoId;
}

/** A pre-roll / mid-roll ad is playing (the player's duration is the ad's then). */
export function isAdShowing(player: Element): boolean {
	return player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
}
