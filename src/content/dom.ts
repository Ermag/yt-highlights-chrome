/**
 * Every YouTube DOM dependency in one place, so a YouTube redesign is a
 * one-file fix.
 */
import { waitFor, type WaitForOptions } from '../shared/async';

export const SELECTORS = {
	moviePlayer: '#movie_player',
	video: '#movie_player video.html5-main-video, #movie_player video',
	progressBar: '#movie_player .ytp-progress-bar',
	leftControls: '#movie_player .ytp-left-controls',
	settingsMenu: '#movie_player .ytp-settings-menu',
	settingsPanelMenu: '#movie_player .ytp-settings-menu .ytp-panel-menu',
	description: '#description-inline-expander, #description ytd-text-inline-expander',
	comments: 'ytd-comments#comments',
	commentThread:
		'ytd-comment-thread-renderer, ytd-comment-view-model#comment, ytd-comment-renderer#comment',
	commentText: '#content-text',
} as const;

export function query<E extends Element = Element>(
	selector: string,
	root: ParentNode = document,
): E | null {
	return root.querySelector<E>(selector);
}

export function queryAll<E extends Element = Element>(
	selector: string,
	root: ParentNode = document,
): readonly E[] {
	return [...root.querySelectorAll<E>(selector)];
}

export function waitForElement<E extends Element = Element>(
	selector: string,
	options: WaitForOptions & { readonly root?: ParentNode } = {},
): Promise<E> {
	const { root = document, ...waitOptions } = options;
	return waitFor(() => root.querySelector<E>(selector), waitOptions);
}

export function getVideoElement(): HTMLVideoElement | null {
	return query<HTMLVideoElement>(SELECTORS.video);
}

/** Playhead position in seconds, read straight off the media element. */
export function getCurrentTime(): number {
	const video = getVideoElement();
	return video && Number.isFinite(video.currentTime) ? video.currentTime : 0;
}

/** True when this is a `/watch` page; returns the video id or `null`. */
export function watchVideoId(url: string = location.href): string | null {
	const parsed = new URL(url);
	return parsed.pathname === '/watch' ? parsed.searchParams.get('v') : null;
}
