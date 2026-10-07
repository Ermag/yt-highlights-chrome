// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { isAdShowing, isWatchPageReady } from './watch-page';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('isWatchPageReady', () => {
	it("is true once ytd-watch-flexy carries the video's id", () => {
		document.body.innerHTML = '<ytd-watch-flexy video-id="vid2"></ytd-watch-flexy>';
		expect(isWatchPageReady('vid2')).toBe(true);
	});

	it('is false while ytd-watch-flexy still shows the previous video', () => {
		document.body.innerHTML = '<ytd-watch-flexy video-id="vid1"></ytd-watch-flexy>';
		expect(isWatchPageReady('vid2')).toBe(false);
	});

	it('counts an unknown page as ready rather than blocking forever', () => {
		expect(isWatchPageReady('vid2')).toBe(true);
		document.body.innerHTML = '<ytd-watch-flexy></ytd-watch-flexy>';
		expect(isWatchPageReady('vid2')).toBe(true);
	});
});

describe('isAdShowing', () => {
	it('reads the player ad classes', () => {
		const player = document.createElement('div');
		expect(isAdShowing(player)).toBe(false);
		player.classList.add('ad-showing');
		expect(isAdShowing(player)).toBe(true);
		player.className = 'ad-interrupting';
		expect(isAdShowing(player)).toBe(true);
	});
});
