/**
 * The player-controls group: previous / next highlight, the current highlight
 * label, and the on/off toggle (which stays visible even when highlights are
 * hidden, so the feature can be switched back on).
 */
import { activeHighlight, nextHighlight, previousHighlight, type Highlight } from '../core';
import { getCurrentTime } from './dom';
import { CHEVRON, STAR, svgIcon } from './icons';
import { t, type MessageKey } from './i18n';
import type { Tooltip } from './tooltip';

/** How long a prev/next press anchors the next hop (covers a rapid double press). */
const NAV_ANCHOR_MS = 1200;

export interface ControlsOptions {
	readonly highlights: readonly Highlight[];
	readonly onSeek: (seconds: number) => void;
	readonly onToggle: () => void;
	/** Called when the label is activated and the active highlight came only from
	 *  a comment — used to scroll that comment into view. */
	readonly onLabelActivate?: (highlight: Highlight) => void;
	readonly tooltip: Tooltip;
}

export interface Controls {
	readonly element: HTMLElement;
	update: (currentSeconds: number) => void;
	setEnabledState: (enabled: boolean) => void;
	destroy: () => void;
}

export function createControls(options: ControlsOptions): Controls {
	const { highlights, onSeek, onToggle, onLabelActivate, tooltip } = options;

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

	// Hover/focus tooltips. Prev/next name the highlight they'll jump to (from the
	// same anchored position `step` uses); the toggle reflects its current state.
	let toggleOn = true;
	const attachTip = (btn: HTMLElement, lines: () => readonly string[]): void => {
		const show = (): void => {
			const content = lines();
			if (content.length > 0) tooltip.show(btn, content);
		};
		const hide = (): void => {
			tooltip.hide();
		};
		btn.addEventListener('mouseenter', show);
		btn.addEventListener('focus', show);
		btn.addEventListener('mouseleave', hide);
		btn.addEventListener('blur', hide);
	};
	const targetTip =
		(key: MessageKey, pick: (list: readonly Highlight[], at: number) => Highlight | null) =>
		(): readonly string[] => {
			const target = pick(highlights, navAnchor ?? getCurrentTime());
			if (!target) return [t(key)];
			const label = target.labels[0];
			return [t(key), label ? `${target.stamp}  ${label}` : target.stamp];
		};
	attachTip(prevButton, targetTip('previousHighlight', previousHighlight));
	attachTip(nextButton, targetTip('nextHighlight', nextHighlight));
	attachTip(toggleButton, () => [t(toggleOn ? 'hideHighlights' : 'showHighlights')]);

	// When the shown highlight came only from a comment, the label links back to
	// that comment (see app.ts → scrollToSourceComment).
	let activeLabelHighlight: Highlight | null = null;
	const labelLinksToComment = (): boolean =>
		onLabelActivate !== undefined &&
		activeLabelHighlight?.sources.length === 1 &&
		activeLabelHighlight.sources[0] === 'comment';

	const activateLabel = (): void => {
		if (activeLabelHighlight && labelLinksToComment()) onLabelActivate?.(activeLabelHighlight);
	};
	label.addEventListener('click', activateLabel);
	label.addEventListener('keydown', (event) => {
		if ((event.key === 'Enter' || event.key === ' ') && labelLinksToComment()) {
			event.preventDefault();
			activateLabel();
		}
	});

	// Tooltip: the full label when it's ellipsis-truncated, plus a hint when the
	// label links to a comment.
	const showLabelTip = (): void => {
		const full = label.textContent ?? '';
		if (full.length === 0) return;
		const truncated = label.scrollWidth > label.clientWidth + 1;
		const lines = [
			...(truncated ? [full] : []),
			...(labelLinksToComment() ? [t('openSourceComment')] : []),
		];
		if (lines.length > 0) tooltip.show(label, lines);
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
			activeLabelHighlight = active;
			const text = active ? (active.labels[0] ?? active.stamp) : '';
			if (label.textContent !== text) label.textContent = text;
			label.hidden = text === '';

			const isLink = labelLinksToComment();
			label.classList.toggle('ytph-label--link', isLink);
			if (isLink) label.setAttribute('role', 'button');
			else label.removeAttribute('role');
		},
		setEnabledState: (enabled) => {
			toggleOn = enabled;
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
