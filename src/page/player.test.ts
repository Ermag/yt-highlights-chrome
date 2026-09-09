import { describe, expect, it } from 'vitest';
import { toPlayerState, type PlayerApi } from './player';

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
		});
	});

	it('carries the page-world extras through', () => {
		const state = toPlayerState(player(), '?v=zzz', {
			description: '0:00 Intro',
			hasNativeChapters: true,
		});
		expect(state?.description).toBe('0:00 Intro');
		expect(state?.hasNativeChapters).toBe(true);
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
		});
	});
});
