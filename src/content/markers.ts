/**
 * The progress-bar overlay: one focusable `<button>` per highlight cluster.
 * Labels reach the DOM only through `aria-label` / the tooltip's `textContent`.
 */
import {
	clusterByProximity,
	positionPercent,
	type Highlight,
	type HighlightCluster,
} from '../core';
import type { Tooltip } from './tooltip';

/** Merge markers that would land within this many pixels of each other. */
const MIN_MARKER_GAP_PX = 6;
const FALLBACK_BAR_WIDTH_PX = 640;

/** Marker width scales with the tightest gap between clusters, within these bounds. */
const MARKER_WIDTH_MIN_PX = 3;
const MARKER_WIDTH_MAX_PX = 6;
const MARKER_WIDTH_GAP_FRACTION = 0.4;

export interface MarkersOptions {
	readonly highlights: readonly Highlight[];
	readonly durationSeconds: number;
	readonly onSeek: (seconds: number) => void;
	readonly tooltip: Tooltip;
	/** Progress-bar width, used to cluster by pixels rather than a fixed percent. */
	readonly progressBarWidthPx?: number | undefined;
}

export interface Markers {
	readonly element: HTMLElement;
	setVisible: (visible: boolean) => void;
	destroy: () => void;
}

export function createMarkers(options: MarkersOptions): Markers {
	const { highlights, durationSeconds, onSeek, tooltip, progressBarWidthPx } = options;

	const element = document.createElement('div');
	element.className = 'ytph-markers';

	const barWidth =
		progressBarWidthPx && progressBarWidthPx > 0 ? progressBarWidthPx : FALLBACK_BAR_WIDTH_PX;
	const minGapPercent = Math.min(2, Math.max(0.1, (MIN_MARKER_GAP_PX / barWidth) * 100));

	const clusters = clusterByProximity(highlights, durationSeconds, minGapPercent);
	element.style.setProperty('--ytph-marker-width', `${markerWidthPx(clusters, barWidth)}px`);

	for (const cluster of clusters) {
		element.appendChild(createMarker(cluster, durationSeconds, onSeek, tooltip));
	}

	return {
		element,
		setVisible: (visible) => {
			element.hidden = !visible;
		},
		destroy: () => {
			tooltip.hide();
			element.remove();
		},
	};
}

function createMarker(
	cluster: HighlightCluster,
	durationSeconds: number,
	onSeek: (seconds: number) => void,
	tooltip: Tooltip,
): HTMLButtonElement {
	const lines = clusterLines(cluster);

	const marker = document.createElement('button');
	marker.type = 'button';
	marker.className = 'ytph-marker';
	marker.style.left = `${positionPercent(cluster.seconds, durationSeconds)}%`;
	marker.setAttribute('aria-label', lines.join('; '));

	// The marker sits on top of `.ytp-progress-bar`; without this the same
	// gesture also triggers YouTube's own seek-to-cursor.
	const swallow = (event: Event): void => {
		event.stopPropagation();
	};
	marker.addEventListener('pointerdown', swallow);
	marker.addEventListener('mousedown', swallow);
	marker.addEventListener('click', (event) => {
		event.stopPropagation();
		onSeek(cluster.seconds);
	});
	const show = (): void => {
		tooltip.show(marker, lines);
	};
	const hide = (): void => {
		tooltip.hide();
	};
	marker.addEventListener('mouseenter', show);
	marker.addEventListener('mouseleave', hide);
	marker.addEventListener('focus', show);
	marker.addEventListener('blur', hide);

	return marker;
}

const clusterLines = (cluster: HighlightCluster): readonly string[] =>
	cluster.highlights.flatMap((highlight) =>
		highlight.labels.length > 0
			? highlight.labels.map((label) => `${highlight.stamp}  ${label}`)
			: [highlight.stamp],
	);

/** Half the tightest inter-cluster gap, clamped — wide when sparse, thin when dense. */
function markerWidthPx(clusters: readonly HighlightCluster[], barWidthPx: number): number {
	if (clusters.length < 2) return MARKER_WIDTH_MAX_PX;
	const gapsPx = clusters
		.slice(1)
		.map(
			(cluster, index) =>
				((cluster.percent - (clusters[index]?.percent ?? cluster.percent)) / 100) *
				barWidthPx,
		);
	const target = Math.round(Math.min(...gapsPx) * MARKER_WIDTH_GAP_FRACTION);
	return Math.min(MARKER_WIDTH_MAX_PX, Math.max(MARKER_WIDTH_MIN_PX, target));
}
