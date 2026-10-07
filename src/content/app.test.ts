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
		<div class="ytp-settings-menu"><div class="ytp-panel"><div class="ytp-panel-menu"></div></div></div>
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
	pageReady: true,
	...over,
});

interface Bridge {
	/** What the bridge answers `query-player` with; tests swap it to move the page on. */
	state: PlayerState;
	readonly outbox: ContentMessage[];
	/** An unprompted push, like the real bridge's on loadedmetadata / navigation. */
	push: () => void;
}

const cleanups: (() => void)[] = [];

function stubBridge(initial: PlayerState): Bridge {
	const bridge: Bridge = {
		state: initial,
		outbox: [],
		push: () => {
			document.dispatchEvent(
				new CustomEvent('ytph:page', {
					detail: JSON.stringify({ kind: 'player-state', state: bridge.state }),
				}),
			);
		},
	};
	const listener = (event: Event): void => {
		const message = JSON.parse((event as CustomEvent<string>).detail) as ContentMessage;
		bridge.outbox.push(message);
		if (message.kind === 'query-player') bridge.push();
	};
	document.addEventListener('ytph:content', listener);
	cleanups.push(() => {
		document.removeEventListener('ytph:content', listener);
	});
	return bridge;
}

async function startApp(): Promise<void> {
	const { start } = await import('./app');
	cleanups.push(await start());
}

const markerCount = (): number =>
	document.querySelectorAll('.ytp-progress-bar .ytph-markers button.ytph-marker').length;

function addComment(text: string): void {
	const thread = document.createElement('ytd-comment-thread-renderer');
	const content = document.createElement('div');
	content.id = 'content-text';
	content.textContent = text;
	thread.appendChild(content);
	document.querySelector('#comments #contents')!.appendChild(thread);
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
	cleanups.splice(0).forEach((cleanup) => {
		cleanup();
	});
	history.replaceState(null, '', '/watch?v=vid1');
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('content app (integration)', () => {
	it('renders markers + controls + menu item and seeks on Next', async () => {
		const { outbox } = stubBridge(playerState());
		await startApp();
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
		addComment('3:00 the part everyone talks about');

		stubBridge(playerState({ hasNativeChapters: true }));
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);

		const markers = [...document.querySelectorAll('.ytph-markers button.ytph-marker')];
		expect(markers).toHaveLength(1); // only the comment, not the 3 description stamps
		expect(markers[0]?.getAttribute('aria-label')).toContain('the part everyone talks about');
	});

	it('mounts a toggle-only control (and the settings toggle) when the video has no highlights', async () => {
		stubBridge(playerState({ description: 'Just a plain description, no timestamps.' }));
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);

		expect(document.querySelectorAll('.ytph-markers button.ytph-marker')).toHaveLength(0);
		const controls = document.querySelector('.ytph-controls');
		expect(controls).not.toBeNull();
		expect(controls?.classList.contains('ytph-empty')).toBe(true);
		expect(controls?.querySelector('.ytph-toggle')).not.toBeNull();

		const menuItem = document.querySelector('.ytp-panel-menu .ytph-menuitem');
		expect(menuItem).not.toBeNull();
		expect(menuItem?.querySelector('.ytp-menuitem-label')?.textContent).toBe(
			'Highlights for YouTube',
		);
	});

	it('hides the overlay when the stored setting is disabled', async () => {
		stubBridge(playerState());
		await globalThis.chrome.storage.local.set({ settings: { enabled: false } });

		await startApp();
		await vi.advanceTimersByTimeAsync(4000);

		const markers = document.querySelector<HTMLElement>('.ytph-markers');
		expect(markers).not.toBeNull();
		expect(markers?.hidden).toBe(true);
		expect(document.querySelector('.ytph-controls')?.classList.contains('ytph-off')).toBe(true);
	});

	it('ignores page state until the watch page has caught up with the video', async () => {
		// Mid-navigation: the player has the new id, the description panel doesn't.
		const bridge = stubBridge(
			playerState({ description: '0:10 previous video', pageReady: false }),
		);
		await startApp();
		await vi.advanceTimersByTimeAsync(2000);
		expect(markerCount()).toBe(0);

		bridge.state = playerState();
		bridge.push();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);
	});

	it('falls back to the unready state if the page never reports ready', async () => {
		stubBridge(playerState({ pageReady: false }));
		await startApp();
		await vi.advanceTimersByTimeAsync(16_000);
		expect(markerCount()).toBe(3);
	});

	it('renders description highlights without waiting for comments', async () => {
		document.querySelector('#comments #contents')!.replaceChildren();
		stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);
	});

	it('rebuilds when the duration changes (e.g. an ad reported its own length)', async () => {
		const bridge = stubBridge(playerState({ durationSeconds: 120 }));
		await startApp();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(1); // only 0:00 fits in 120s

		bridge.state = playerState({ durationSeconds: 600 });
		bridge.push();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);
	});

	it('adds comment highlights that load late', async () => {
		stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);
		expect(markerCount()).toBe(3);

		addComment('7:30 the comment that loaded on scroll');
		await vi.advanceTimersByTimeAsync(1000);
		expect(markerCount()).toBe(4);
	});

	it('swaps the overlay on navigation and ignores the old video afterwards', async () => {
		const bridge = stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);
		expect(markerCount()).toBe(3);

		history.pushState(null, '', '/watch?v=vid2');
		bridge.state = playerState({ videoId: 'vid2', description: '1:00 Only one' });
		document.dispatchEvent(new Event('yt-navigate-finish'));
		await vi.advanceTimersByTimeAsync(100);

		expect(markerCount()).toBe(1);
		expect(document.querySelectorAll('.ytph-controls')).toHaveLength(1);
		expect(document.querySelector('.ytph-marker')?.getAttribute('aria-label')).toContain(
			'Only one',
		);

		// A straggling push for the previous video changes nothing.
		bridge.state = playerState();
		bridge.push();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(1);
	});

	it("doesn't resurrect the old video's overlay from a late playback tick", async () => {
		const bridge = stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);

		// Two quick ticks: the throttle runs the first and schedules a trailing one.
		const video = document.querySelector('#movie_player video')!;
		video.dispatchEvent(new Event('timeupdate'));
		video.dispatchEvent(new Event('timeupdate'));

		history.pushState(null, '', '/watch?v=vid2');
		bridge.state = playerState({ videoId: 'vid2', description: '1:00 Only one' });
		document.dispatchEvent(new Event('yt-navigate-finish'));
		await vi.advanceTimersByTimeAsync(1500);

		expect(document.querySelectorAll('.ytph-controls')).toHaveLength(1);
		expect(document.querySelectorAll('.ytph-markers')).toHaveLength(1);
		expect(markerCount()).toBe(1);
	});

	it('switches videos even when no navigation event arrives', async () => {
		const bridge = stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);

		history.pushState(null, '', '/watch?v=vid2');
		bridge.state = playerState({ videoId: 'vid2', description: '1:00 Only one' });
		bridge.push(); // e.g. loadedmetadata for the new video
		await vi.advanceTimersByTimeAsync(100);

		expect(markerCount()).toBe(1);
	});

	it('re-attaches the overlay if YouTube rebuilds the player chrome', async () => {
		stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);

		const bar = document.querySelector('.ytp-progress-bar')!;
		const controls = document.querySelector('.ytp-left-controls')!;
		bar.replaceWith(
			Object.assign(document.createElement('div'), { className: 'ytp-progress-bar' }),
		);
		controls.replaceWith(
			Object.assign(document.createElement('div'), { className: 'ytp-left-controls' }),
		);
		await vi.advanceTimersByTimeAsync(1100);

		expect(markerCount()).toBe(3);
		expect(document.querySelector('.ytp-left-controls .ytph-controls')).not.toBeNull();
	});

	it('keeps the last known duration when a later push reports 0', async () => {
		const bridge = stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);

		bridge.state = playerState({ durationSeconds: 0 }); // e.g. mid-roll ad
		bridge.push();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);
	});

	it('re-reads the page shortly after ready to catch late chapter panels', async () => {
		document.querySelector('#comments #contents')!.replaceChildren();
		const bridge = stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(100);
		expect(markerCount()).toBe(3);

		// The chapters panel renders after the ready push; nothing pushes again.
		bridge.state = playerState({ hasNativeChapters: true });
		await vi.advanceTimersByTimeAsync(3100);
		expect(markerCount()).toBe(0);
	});

	it('carries keyboard focus over when highlights update under the user', async () => {
		stubBridge(playerState());
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);

		const next = document.querySelector<HTMLElement>('.ytph-next')!;
		next.focus();
		addComment('7:30 the comment that loaded on scroll');
		await vi.advanceTimersByTimeAsync(1000);

		expect(document.querySelector('.ytph-next')).not.toBe(next); // controls were rebuilt
		expect(document.activeElement?.classList.contains('ytph-next')).toBe(true);
	});

	it("doesn't leave a hover tooltip stuck when the hovered control is replaced", async () => {
		// No highlights yet, so no markers whose teardown would hide the tooltip.
		stubBridge(playerState({ description: 'No timestamps here.' }));
		await startApp();
		await vi.advanceTimersByTimeAsync(4000);

		document.querySelector('.ytph-toggle')!.dispatchEvent(new MouseEvent('mouseenter'));
		await vi.advanceTimersByTimeAsync(500);
		expect(document.querySelector<HTMLElement>('.ytph-tooltip')?.hidden).toBe(false);

		addComment('7:30 the comment that loaded on scroll');
		await vi.advanceTimersByTimeAsync(1000);
		expect(document.querySelector<HTMLElement>('.ytph-tooltip')?.hidden).toBe(true);
	});
});
