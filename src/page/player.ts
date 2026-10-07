/**
 * Thin wrapper over YouTube's `#movie_player`. MAIN world only — the ISOLATED
 * content script sees the element but not these Polymer-added methods.
 */
import type { PlayerState } from '../shared/protocol';
import { hasNativeChapters } from './chapters';
import { readDescription, type PlayerResponse } from './description';
import { isAdShowing, isWatchPageReady } from './watch-page';

/** Page-world facts about the current video that `toPlayerState` can't read itself. */
export interface PlayerExtras {
	readonly description?: string;
	readonly hasNativeChapters?: boolean;
	readonly pageReady?: boolean;
	/** An ad is playing, so `getDuration()` is the ad's length, not the video's. */
	readonly adShowing?: boolean;
}

interface VideoData {
	readonly video_id?: string;
	readonly isLive?: boolean;
}

/** The subset of the player API we depend on. */
export interface PlayerApi {
	getDuration(): number;
	getCurrentTime(): number;
	seekTo(seconds: number, allowSeekAhead?: boolean): void;
	getVideoData(): VideoData;
	/** Not on every player build — optional so its absence degrades, not breaks. */
	getPlayerResponse?(): PlayerResponse | null | undefined;
}

export type YouTubePlayer = Element & PlayerApi;

const PLAYER_SELECTORS = ['#movie_player', '.html5-video-player'] as const;

function hasPlayerApi(element: Element): element is YouTubePlayer {
	const candidate = element as Partial<PlayerApi>;
	return (
		typeof candidate.getDuration === 'function' &&
		typeof candidate.getCurrentTime === 'function' &&
		typeof candidate.seekTo === 'function' &&
		typeof candidate.getVideoData === 'function'
	);
}

export function getPlayer(): YouTubePlayer | null {
	return (
		PLAYER_SELECTORS.map((selector) => document.querySelector(selector)).find(
			(element): element is YouTubePlayer => element !== null && hasPlayerApi(element),
		) ?? null
	);
}

/**
 * Pure projection of a player into a {@link PlayerState}.
 * Falls back to `?v=` for the id. Duration comes from the player response's
 * `lengthSeconds` when it matches the video (immune to ads), else from
 * `getDuration()` unless an ad is playing; live / not-yet-known is `0`.
 */
export function toPlayerState(
	player: PlayerApi,
	locationSearch: string,
	extras: PlayerExtras = {},
): PlayerState | null {
	const data = player.getVideoData();
	const videoId = data.video_id ?? new URLSearchParams(locationSearch).get('v') ?? '';
	if (videoId === '') return null;

	const isLive = data.isLive ?? false;
	const details = player.getPlayerResponse?.()?.videoDetails;
	const length = details?.videoId === videoId ? Number(details.lengthSeconds) : 0;
	const playerDuration = extras.adShowing ? 0 : Number(player.getDuration());
	const durationSeconds = isLive ? 0 : positiveOr(length, positiveOr(playerDuration, 0));

	return {
		videoId,
		durationSeconds,
		isLive,
		description: extras.description ?? '',
		hasNativeChapters: extras.hasNativeChapters ?? false,
		pageReady: extras.pageReady ?? false,
	};
}

const positiveOr = (value: number, fallback: number): number =>
	Number.isFinite(value) && value > 0 ? value : fallback;

export function readPlayerState(): PlayerState | null {
	const player = getPlayer();
	const base = player
		? toPlayerState(player, window.location.search, { adShowing: isAdShowing(player) })
		: null;
	if (!player || !base) return null;
	const pageReady = isWatchPageReady(base.videoId);
	return {
		...base,
		description: readDescription(base.videoId, {
			playerResponse: player.getPlayerResponse?.(),
			pageReady,
		}),
		// The chapter panels are page DOM too: meaningless until the page catches up.
		hasNativeChapters: pageReady && hasNativeChapters(),
		pageReady,
	};
}

export function seek(seconds: number): void {
	getPlayer()?.seekTo(Math.max(0, seconds), true);
}
