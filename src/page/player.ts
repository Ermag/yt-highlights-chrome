/**
 * Thin wrapper over YouTube's `#movie_player`. MAIN world only — the ISOLATED
 * content script sees the element but not these Polymer-added methods.
 */
import type { PlayerState } from '../shared/protocol';
import { hasNativeChapters } from './chapters';
import { readDescription } from './description';

/** Page-world facts about the current video that `toPlayerState` can't read itself. */
export interface PlayerExtras {
	readonly description?: string;
	readonly hasNativeChapters?: boolean;
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
 * Falls back to `?v=` for the id; treats live / not-yet-known durations as `0`.
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
	const rawDuration = Number(player.getDuration());
	const durationSeconds =
		!isLive && Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

	return {
		videoId,
		durationSeconds,
		isLive,
		description: extras.description ?? '',
		hasNativeChapters: extras.hasNativeChapters ?? false,
	};
}

export function readPlayerState(): PlayerState | null {
	const player = getPlayer();
	const base = player ? toPlayerState(player, window.location.search) : null;
	if (!base) return null;
	return {
		...base,
		description: readDescription(base.videoId),
		hasNativeChapters: hasNativeChapters(),
	};
}

export function seek(seconds: number): void {
	getPlayer()?.seekTo(Math.max(0, seconds), true);
}
