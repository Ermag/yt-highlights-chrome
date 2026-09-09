/**
 * The player-controls group: previous / next highlight, the current highlight
 * label, and the on/off toggle (which stays visible even when highlights are
 * hidden, so the feature can be switched back on).
 */
import { activeHighlight, nextHighlight, previousHighlight, type Highlight } from '../core';
import { getCurrentTime } from './dom';
import { CHEVRON, STAR, svgIcon } from './icons';
import { t } from './i18n';
import type { Tooltip } from './tooltip';

/** How long a prev/next press anchors the next hop (covers a rapid double press). */
const NAV_ANCHOR_MS = 1200;

export interface ControlsOptions {
	readonly highlights: readonly Highlight[];
	readonly onSeek: (seconds: number) => void;
	readonly onToggle: () => void;
	readonly tooltip: Tooltip;
}

export interface Controls {
	readonly element: HTMLElement;
	update: (currentSeconds: number) => void;
	setEnabledState: (enabled: boolean) => void;
	destroy: () => void;
}

export function createControls(options: ControlsOptions): Controls {
	const { highlights, onSeek, onToggle, tooltip } = options;

	const element = document.createElement('div');
	// Not `.ytp-button` — YouTube's rules for it would fight our flex layout.
	element.className = 'ytph-controls';

	const prevButton = button('ytph-prev', t('previousHighlight'), svgIcon(CHEVRON, '0 0 30 32'));
	const nextButton = button('ytph-next', t('nextHighlight'), svgIcon(CHEVRON, '0 0 30 32'));
	const label = document.createElement('span');
	label.className = 'ytph-label';
	label.tabIndex = 0;
	const toggleButton = button('ytph-toggle', t('toggleHighlights'), svgIcon(STAR, '0 0 24 24'));

	element.append(prevButton, nextButton, label, toggleButton);

	// After a prev/next press the playhead takes a moment to reach the target, so
	// a fast second press would recompute from the stale position and re-seek to
	// the same highlight. Anchor the next hop to the last target we jumped to.
	let navAnchor: number | null = null;
	let navAnchorTimer: ReturnType<typeof setTimeout> | undefined;

	const step = (pick: (list: readonly Highlight[], at: number) => Highlight | null): void => {
		const target = pick(highlights, navAnchor ?? getCurrentTime());
		if (!target) return;
		navAnchor = target.seconds;
		clearTimeout(navAnchorTimer);
		navAnchorTimer = setTimeout(() => {
			navAnchor = null;
		}, NAV_ANCHOR_MS);
		onSeek(target.seconds);
	};
	prevButton.addEventListener('click', () => {
		step(previousHighlight);
	});
	nextButton.addEventListener('click', () => {
		step(nextHighlight);
	});
	toggleButton.addEventListener('click', () => {
		onToggle();
	});

	// Show the full label in a tooltip when it's ellipsis-truncated.
	const showLabelTip = (): void => {
		const full = label.textContent ?? '';
		if (full.length > 0 && label.scrollWidth > label.clientWidth + 1) {
			tooltip.show(label, [full]);
		}
	};
	const hideLabelTip = (): void => {
		tooltip.hide();
	};
	label.addEventListener('mouseenter', showLabelTip);
	label.addEventListener('mouseleave', hideLabelTip);
	label.addEventListener('focus', showLabelTip);
	label.addEventListener('blur', hideLabelTip);

	return {
		element,
		update: (currentSeconds) => {
			// Buttons are never disabled — they wrap around the ends.
			const active = activeHighlight(highlights, currentSeconds);
			const text = active ? (active.labels[0] ?? active.stamp) : '';
			if (label.textContent !== text) label.textContent = text;
			label.hidden = text === '';
		},
		setEnabledState: (enabled) => {
			element.classList.toggle('ytph-off', !enabled);
			toggleButton.setAttribute('aria-pressed', String(enabled));
		},
		destroy: () => {
			clearTimeout(navAnchorTimer);
			element.remove();
		},
	};
}

function button(className: string, ariaLabel: string, child: SVGElement): HTMLButtonElement {
	const el = document.createElement('button');
	el.type = 'button';
	el.className = `ytph-btn ${className}`;
	el.setAttribute('aria-label', ariaLabel);
	el.appendChild(child);
	return el;
}
