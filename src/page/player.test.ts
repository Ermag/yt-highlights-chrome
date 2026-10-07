// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readPlayerState, toPlayerState, type PlayerApi } from './player';

const player = (over: Partial<PlayerApi> = {}): PlayerApi => ({
	getDuration: () => 300,
	getCurrentTime: () => 0,
	seekTo: () => undefined,
	getVideoData: () => ({ video_id: 'abc123' }),
	...over,
});

describe('toPlayerState', () => {
	it('reads id and duration from the player', () => {
		expect(toPlayerState(player(), '?v=zzz')).toEqual({
			videoId: 'abc123',
			durationSeconds: 300,
			isLive: false,
			description: '',
			hasNativeChapters: false,
			pageReady: false,
		});
	});

	it('carries the page-world extras through', () => {
		const state = toPlayerState(player(), '?v=zzz', {
			description: '0:00 Intro',
			hasNativeChapters: true,
			pageReady: true,
		});
		expect(state?.description).toBe('0:00 Intro');
		expect(state?.hasNativeChapters).toBe(true);
		expect(state?.pageReady).toBe(true);
	});

	it('falls back to ?v= when the player has no id yet', () => {
		const p = player({ getVideoData: () => ({}) });
		expect(toPlayerState(p, '?v=fromUrl&t=10')?.videoId).toBe('fromUrl');
	});

	it('returns null when there is no id anywhere', () => {
		expect(toPlayerState(player({ getVideoData: () => ({}) }), '')).toBeNull();
	});

	it('treats a not-yet-known duration as 0', () => {
		expect(toPlayerState(player({ getDuration: () => 0 }), '?v=x')?.durationSeconds).toBe(0);
		expect(
			toPlayerState(player({ getDuration: () => Number.NaN }), '?v=x')?.durationSeconds,
		).toBe(0);
	});

	it('treats live streams as duration 0', () => {
		const p = player({
			getDuration: () => Number.POSITIVE_INFINITY,
			getVideoData: () => ({ video_id: 'live1', isLive: true }),
		});
		expect(toPlayerState(p, '')).toEqual({
			videoId: 'live1',
			durationSeconds: 0,
			isLive: true,
			description: '',
			hasNativeChapters: false,
			pageReady: false,
		});
	});

	it("prefers the player response's lengthSeconds when it is this video's", () => {
		const p = player({
			getPlayerResponse: () => ({
				videoDetails: { videoId: 'abc123', lengthSeconds: '612' },
			}),
		});
		expect(toPlayerState(p, '')?.durationSeconds).toBe(612);
	});

	it('ignores a player response that still belongs to the previous video', () => {
		const p = player({
			getPlayerResponse: () => ({ videoDetails: { videoId: 'old', lengthSeconds: '99' } }),
		});
		expect(toPlayerState(p, '')?.durationSeconds).toBe(300);
	});

	it("doesn't take an ad's length for the video's", () => {
		expect(toPlayerState(player(), '', { adShowing: true })?.durationSeconds).toBe(0);
		const withResponse = player({
			getPlayerResponse: () => ({
				videoDetails: { videoId: 'abc123', lengthSeconds: '612' },
			}),
		});
		expect(toPlayerState(withResponse, '', { adShowing: true })?.durationSeconds).toBe(612);
	});
});

describe('readPlayerState', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	/** Mid-navigation DOM: the player has `vid2`, the page still shows `vid1`'s panels. */
	function mountPage(pageVideoId: string): void {
		document.body.innerHTML = `
			<ytd-watch-flexy video-id="${pageVideoId}"></ytd-watch-flexy>
			<ytd-engagement-panel-section-list-renderer
				target-id="engagement-panel-macro-markers-description-chapters"></ytd-engagement-panel-section-list-renderer>
			<div id="description-inline-expander">0:00 vid1's description</div>
			<div id="movie_player"></div>`;
		Object.assign(document.querySelector('#movie_player')!, {
			...player({ getVideoData: () => ({ video_id: 'vid2' }) }),
			getPlayerResponse: () => ({
				videoDetails: {
					videoId: 'vid2',
					shortDescription: '0:00 vid2 intro',
					lengthSeconds: '900',
				},
			}),
		});
	}

	it("doesn't trust page DOM until it belongs to the player's video", () => {
		mountPage('vid1');
		expect(readPlayerState()).toMatchObject({
			videoId: 'vid2',
			pageReady: false,
			hasNativeChapters: false, // vid1's chapter panel
			description: '0:00 vid2 intro', // from the player response, not vid1's panel
			durationSeconds: 900,
		});
	});

	it('reads the page DOM once it has caught up', () => {
		mountPage('vid2');
		expect(readPlayerState()).toMatchObject({ pageReady: true, hasNativeChapters: true });
	});
});
