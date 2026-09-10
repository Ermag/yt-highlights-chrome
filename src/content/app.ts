/**
 * Lifecycle orchestration for the ISOLATED world.
 *
 * One {@link Session} per `/watch` video: fetch the player state (via the MAIN
 * bridge) and the page text, build highlights, mount the UI, keep it in sync
 * with playback, and tear everything down on navigation.
 */
import { buildHighlights, type Highlight } from '../core';
import { noop, throttle, waitFor } from '../shared/async';
import { onPageMessage, sendToPage, type PlayerState } from '../shared/protocol';
import { scrollToSourceComment } from './comments';
import { createControls, type Controls } from './controls';
import {
	SELECTORS,
	getCurrentTime,
	getVideoElement,
	query,
	waitForElement,
	watchVideoId,
} from './dom';
import { createMarkers, type Markers } from './markers';
import { mountSettingsMenuItem, type SettingsMenuItem } from './settings-menu';
import { readComments } from './sources';
import { getSettings, onSettingsChanged, setEnabled } from './store';
import { createTooltip, type Tooltip } from './tooltip';

interface Session {
	readonly videoId: string;
	onPlayerState: (state: PlayerState) => void;
	onEnabledChange: () => void;
	dispose: () => void;
}

let session: Session | null = null;
let latestState: PlayerState | null = null;
let enabled = true;

export async function start(): Promise<void> {
	enabled = (await getSettings()).enabled;

	onSettingsChanged((settings) => {
		enabled = settings.enabled;
		session?.onEnabledChange();
	});

	onPageMessage((message) => {
		latestState = message.kind === 'player-state' ? message.state : null;
		if (message.kind === 'player-state' && session?.videoId === message.state.videoId) {
			session.onPlayerState(message.state);
		}
	});

	const sync = (): void => {
		const videoId = watchVideoId();
		if (videoId === session?.videoId) return;
		session?.dispose();
		session = videoId ? createSession(videoId) : null;
	};

	window.addEventListener('yt-navigate-finish', sync);
	sync();
}

function createSession(videoId: string): Session {
	const abort = new AbortController();

	let tooltip: Tooltip | null = null;
	let markers: Markers | null = null;
	let controls: Controls | null = null;
	let menuItem: SettingsMenuItem | null = null;
	let highlights: readonly Highlight[] = [];
	let renderedDuration = -1;
	let detachTime = noop;

	const onSeek = (seconds: number): void => {
		sendToPage({ kind: 'seek', seconds });
	};
	const onToggle = (): void => {
		void setEnabled(!enabled);
	};

	const applyEnabled = (): void => {
		markers?.setVisible(enabled);
		controls?.setEnabledState(enabled);
		menuItem?.setChecked(enabled);
	};

	const render = (durationSeconds: number): void => {
		if (highlights.length === 0 || durationSeconds === renderedDuration) return;
		renderedDuration = durationSeconds;

		tooltip ??= createTooltip();
		markers?.destroy();
		markers = createMarkers({
			highlights,
			durationSeconds,
			onSeek,
			tooltip,
			progressBarWidthPx: query(SELECTORS.progressBar)?.getBoundingClientRect().width,
		});
		void mountInto(SELECTORS.progressBar, markers.element, abort.signal);

		if (!controls) {
			controls = createControls({
				highlights,
				onSeek,
				onToggle,
				onLabelActivate: scrollToSourceComment,
				tooltip,
			});
			void mountInto(SELECTORS.leftControls, controls.element, abort.signal);
			detachTime = attachTimeUpdates((seconds) => controls?.update(seconds), abort.signal);
		}

		applyEnabled();
		controls?.update(getCurrentTime());
	};

	// The settings toggle is the extension's global on/off switch and its main
	// discoverability surface, so it mounts on every /watch page — independent of
	// whether this particular video has any highlights.
	void waitForElement(SELECTORS.settingsMenu, { signal: abort.signal, timeoutMs: 20_000 })
		.then((menu) => {
			if (!abort.signal.aborted) {
				menuItem = mountSettingsMenuItem(menu, { checked: enabled, onToggle });
			}
		})
		.catch(noop);

	void (async () => {
		const state = await waitFor(
			() => {
				if (latestState?.videoId === videoId) return latestState;
				sendToPage({ kind: 'query-player' });
				return null;
			},
			{ signal: abort.signal, intervalMs: 500, timeoutMs: 15_000 },
		).catch(() => null);

		const comments = await readComments(abort.signal);
		if (abort.signal.aborted) return;

		// The description and chapter state can settle after our first read (lazy
		// panels, pre-roll ads), so take the freshest snapshot before building.
		sendToPage({ kind: 'query-player' });
		const settled = latestState?.videoId === videoId ? latestState : state;

		highlights = buildHighlights({
			// YouTube already puts description timestamps on the bar as chapters.
			description: settled?.hasNativeChapters ? '' : (settled?.description ?? ''),
			comments,
			durationSeconds: settled?.durationSeconds ?? 0,
		});
		render(settled?.durationSeconds ?? 0);
	})();

	return {
		videoId,
		onPlayerState: (state) => {
			if (highlights.length > 0 && state.durationSeconds > 0) render(state.durationSeconds);
		},
		onEnabledChange: applyEnabled,
		dispose: () => {
			abort.abort();
			detachTime();
			markers?.destroy();
			controls?.destroy();
			menuItem?.destroy();
			tooltip?.destroy();
		},
	};
}

async function mountInto(selector: string, node: Element, signal: AbortSignal): Promise<void> {
	try {
		const host = await waitForElement(selector, { signal, timeoutMs: 20_000 });
		if (!signal.aborted && !host.contains(node)) host.appendChild(node);
	} catch {
		// Host never appeared — nothing to mount into.
	}
}

function attachTimeUpdates(onTick: (seconds: number) => void, signal: AbortSignal): () => void {
	const video = getVideoElement();
	const handler = throttle(() => {
		onTick(getCurrentTime());
	}, 500);
	video?.addEventListener('timeupdate', handler);
	// Backstop for scrubbing while paused (no `timeupdate` fires then).
	const interval = setInterval(() => {
		onTick(getCurrentTime());
	}, 1000);

	const cleanup = (): void => {
		video?.removeEventListener('timeupdate', handler);
		clearInterval(interval);
	};
	signal.addEventListener('abort', cleanup, { once: true });
	return cleanup;
}
