// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.youtube.com/watch?v=vid1" }
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeChrome } from '../test-support/fake-chrome';
import type { ContentMessage, PlayerState } from '../shared/protocol';

const DESCRIPTION = '0:00 Intro\n5:00 Middle\n10:00 End';

const PLAYER_HTML = `
	<div id="movie_player">
		<div class="ytp-progress-bar"></div>
		<div class="ytp-left-controls"></div>
		<div class="ytp-settings-menu"><div class="ytp-panel-menu"></div></div>
		<video></video>
	</div>
	<ytd-comments id="comments"><div id="contents">
		<ytd-comment-thread-renderer><div id="content-text">great video</div></ytd-comment-thread-renderer>
		<ytd-comment-thread-renderer><div id="content-text">loved it</div></ytd-comment-thread-renderer>
	</div></ytd-comments>`;

const playerState = (over: Partial<PlayerState> = {}): PlayerState => ({
	videoId: 'vid1',
	durationSeconds: 600,
	isLive: false,
	description: DESCRIPTION,
	hasNativeChapters: false,
	...over,
});

function stubBridge(state: PlayerState): ContentMessage[] {
	const outbox: ContentMessage[] = [];
	document.addEventListener('ytph:content', (event) => {
		const message = JSON.parse((event as CustomEvent<string>).detail) as ContentMessage;
		outbox.push(message);
		if (message.kind === 'query-player') {
			document.dispatchEvent(
				new CustomEvent('ytph:page', {
					detail: JSON.stringify({ kind: 'player-state', state }),
				}),
			);
		}
	});
	return outbox;
}

beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
	vi.stubGlobal('chrome', fakeChrome());
	document.body.innerHTML = PLAYER_HTML;
	const video = document.querySelector('#movie_player video')!;
	Object.defineProperty(video, 'currentTime', { value: 0, configurable: true });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('content app (integration)', () => {
	it('renders markers + controls + menu item and seeks on Next', async () => {
		const outbox = stubBridge(playerState());
		const { start } = await import('./app');

		await start();
		await vi.advanceTimersByTimeAsync(4000);

		const markers = document.querySelectorAll(
			'.ytp-progress-bar .ytph-markers button.ytph-marker',
		);
		expect(markers).toHaveLength(3);
		expect(document.querySelector('.ytp-left-controls .ytph-controls')).not.toBeNull();

		const menuItem = document.querySelector('.ytp-panel-menu .ytph-menuitem');
		expect(menuItem).not.toBeNull();
		expect(menuItem?.querySelector('.ytp-menuitem-label')?.textContent).toBe(
			'Highlights for YouTube',
		);
		expect(menuItem?.querySelector('.ytp-menuitem-icon svg')).not.toBeNull();

		document.querySelector('.ytph-next')!.dispatchEvent(new MouseEvent('click'));
		expect(outbox).toContainEqual({ kind: 'seek', seconds: 300 });
	});

	it('skips the description when YouTube already shows chapters, keeping comment highlights', async () => {
		// add a comment with an in-range timestamp
		const contents = document.querySelector('#comments #contents')!;
		const thread = document.createElement('ytd-comment-thread-renderer');
		const text = document.createElement('div');
		text.id = 'content-text';
		text.textContent = '3:00 the part everyone talks about';
		thread.appendChild(text);
		contents.appendChild(thread);

		stubBridge(playerState({ hasNativeChapters: true }));
		const { start } = await import('./app');
		await start();
		await vi.advanceTimersByTimeAsync(4000);

		const markers = [...document.querySelectorAll('.ytph-markers button.ytph-marker')];
		expect(markers).toHaveLength(1); // only the comment, not the 3 description stamps
		expect(markers[0]?.getAttribute('aria-label')).toContain('the part everyone talks about');
	});

	it('mounts the settings toggle even when the video has no highlights', async () => {
		stubBridge(playerState({ description: 'Just a plain description, no timestamps.' }));
		const { start } = await import('./app');

		await start();
		await vi.advanceTimersByTimeAsync(4000);

		expect(document.querySelectorAll('.ytph-markers button.ytph-marker')).toHaveLength(0);
		expect(document.querySelector('.ytph-controls')).toBeNull();

		const menuItem = document.querySelector('.ytp-panel-menu .ytph-menuitem');
		expect(menuItem).not.toBeNull();
		expect(menuItem?.querySelector('.ytp-menuitem-label')?.textContent).toBe(
			'Highlights for YouTube',
		);
	});

	it('hides the overlay when the stored setting is disabled', async () => {
		stubBridge(playerState());
		await globalThis.chrome.storage.local.set({ settings: { enabled: false } });

		const { start } = await import('./app');
		await start();
		await vi.advanceTimersByTimeAsync(4000);

		const markers = document.querySelector<HTMLElement>('.ytph-markers');
		expect(markers).not.toBeNull();
		expect(markers?.hidden).toBe(true);
		expect(document.querySelector('.ytph-controls')?.classList.contains('ytph-off')).toBe(true);
	});
});
