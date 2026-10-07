/**
 * Lifecycle orchestration for the ISOLATED world.
 *
 * One {@link Session} per `/watch` video: follow the player state (via the MAIN
 * bridge) and the comments, rebuild highlights whenever either changes, keep the
 * UI in sync with playback, and tear everything down on navigation.
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
import { watchComments } from './sources';
import { getSettings, onSettingsChanged, setEnabled } from './store';
import { createTooltip, type Tooltip } from './tooltip';

interface Session {
	readonly videoId: string;
	/** Kicks off the async work. Separate from construction so that replies the
	 *  bridge sends synchronously already find this session installed. */
	start: () => void;
	onPlayerState: (state: PlayerState) => void;
	onEnabledChange: () => void;
	dispose: () => void;
}

let session: Session | null = null;
let latestState: PlayerState | null = null;
let enabled = true;

/** Starts following the page. Resolves to a stop function (used by tests). */
export async function start(): Promise<() => void> {
	enabled = (await getSettings()).enabled;

	const offSettings = onSettingsChanged((settings) => {
		enabled = settings.enabled;
		session?.onEnabledChange();
	});

	const sync = (): void => {
		const videoId = watchVideoId();
		if (videoId === session?.videoId) return;
		session?.dispose();
		session = videoId ? createSession(videoId) : null;
		session?.start();
	};

	const offPage = onPageMessage((message) => {
		latestState = message.kind === 'player-state' ? message.state : null;
		// Backstop for a missed navigation event: any bridge push re-checks the URL.
		sync();
		if (message.kind === 'player-state' && session?.videoId === message.state.videoId) {
			session.onPlayerState(message.state);
		}
	});

	// `sync` is idempotent, so listen broadly: navigate-start tears the old video's
	// overlay down as soon as the URL changes (back/forward), the others catch up.
	const navigationEvents = ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated'];
	for (const type of navigationEvents) document.addEventListener(type, sync);
	sync();

	return () => {
		offSettings();
		offPage();
		for (const type of navigationEvents) document.removeEventListener(type, sync);
		session?.dispose();
		session = null;
		latestState = null;
	};
}

/**
 * Highlights are a pure function of two inputs — the page state (description,
 * native-chapter flag, duration) and the comments — so the session just keeps
 * the freshest of each and re-renders whenever the result changes.
 * Nothing is decided once and frozen: a late comment batch, a corrected duration
 * (e.g. after an ad) or a chapter panel that rendered late all flow through.
 */
function createSession(videoId: string): Session {
	const abort = new AbortController();
	const { signal } = abort;

	let tooltip: Tooltip | null = null;
	let markers: Markers | null = null;
	let controls: Controls | null = null;
	let menuItem: SettingsMenuItem | null = null;

	// Latest page state for this video whose DOM-derived fields can be trusted.
	let page: PlayerState | null = null;
	let comments: readonly string[] = [];
	let watchingComments = false;
	// Set when the page never reported ready in time: take what the player has.
	let acceptUnready = false;
	let renderedKey: string | null = null;

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

	// YouTube can rebuild the player chrome (ads, layout switches); re-attach
	// rather than vanish. Cheap enough to run on every time tick.
	const keepMounted = (): void => {
		mountIfDetached(SELECTORS.progressBar, markers?.element);
		mountIfDetached(SELECTORS.leftControls, controls?.element);
	};

	const render = (highlights: readonly Highlight[], durationSeconds: number): void => {
		tooltip ??= createTooltip();

		// Markers need highlights and a known duration to plot; the toggle mounts
		// regardless, so the extension still reads as present (see controls.ts).
		markers?.destroy();
		markers =
			highlights.length > 0 && durationSeconds > 0
				? createMarkers({
						highlights,
						durationSeconds,
						onSeek,
						tooltip,
						progressBarWidthPx: query(SELECTORS.progressBar)?.getBoundingClientRect()
							.width,
					})
				: null;

		const previous = controls;
		controls = createControls({
			highlights,
			onSeek,
			onToggle,
			onLabelActivate: scrollToSourceComment,
			tooltip,
		});
		if (previous?.element.isConnected) previous.element.replaceWith(controls.element);
		previous?.destroy();

		keepMounted();
		applyEnabled();
		controls.update(getCurrentTime());
	};

	const refresh = (): void => {
		if (!page || signal.aborted) return;
		const highlights = buildHighlights({
			// YouTube already puts description timestamps on the bar as chapters.
			description: page.hasNativeChapters ? '' : page.description,
			comments,
			durationSeconds: page.durationSeconds,
		});
		const key = `${page.durationSeconds}|${JSON.stringify(highlights)}`;
		if (key === renderedKey) return;
		renderedKey = key;
		render(highlights, page.durationSeconds);
	};

	const usePageState = (state: PlayerState): void => {
		page = state;
		// Comments are page DOM as well: only read them once it is this video's.
		if (!watchingComments) {
			watchingComments = true;
			watchComments(signal, (next) => {
				comments = next;
				// The description / chapter panels may have settled meanwhile; the
				// bridge answers synchronously, so this lands before `refresh`.
				sendToPage({ kind: 'query-player' });
				refresh();
			});
		}
		refresh();
	};

	return {
		videoId,
		start: () => {
			// The settings toggle is the extension's global on/off switch and its main
			// discoverability surface, so it mounts on every /watch page — independent
			// of whether this particular video has any highlights.
			void waitForElement(SELECTORS.settingsMenu, { signal, timeoutMs: 20_000 })
				.then((menu) => {
					if (!signal.aborted) {
						menuItem = mountSettingsMenuItem(menu, { checked: enabled, onToggle });
					}
				})
				.catch(noop);

			attachTimeUpdates((seconds) => {
				keepMounted();
				controls?.update(seconds);
			}, signal);

			// Ready states usually arrive as bridge pushes (→ onPlayerState); poll as
			// a backstop, and after the timeout settle for whatever the player has.
			void waitFor(
				() => {
					if (latestState?.videoId === videoId && latestState.pageReady)
						return latestState;
					sendToPage({ kind: 'query-player' });
					return null;
				},
				{ signal, intervalMs: 500, timeoutMs: 15_000 },
			)
				.catch(() => {
					if (signal.aborted || latestState?.videoId !== videoId) return null;
					acceptUnready = true;
					return latestState;
				})
				.then((state) => {
					if (state) usePageState(state);
				});
		},
		onPlayerState: (state) => {
			if (state.pageReady || acceptUnready) usePageState(state);
		},
		onEnabledChange: applyEnabled,
		dispose: () => {
			abort.abort();
			markers?.destroy();
			controls?.destroy();
			menuItem?.destroy();
			tooltip?.destroy();
		},
	};
}

function mountIfDetached(selector: string, node: Element | undefined): void {
	if (node && !node.isConnected) query(selector)?.appendChild(node);
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
