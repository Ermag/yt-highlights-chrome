/**
 * A single shared tooltip element. Text-only (`textContent`) — this is where v3's
 * comment-driven XSS lived, via `innerHTML` into Tippy.
 *
 * `show` waits `showDelayMs` before appearing (matching a native tooltip); `hide`
 * cancels any pending show.
 */
export interface Tooltip {
	show: (anchor: Element, lines: readonly string[]) => void;
	hide: () => void;
	destroy: () => void;
}

const EDGE_GAP = 8;
const VIEWPORT_MARGIN = 4;
const DEFAULT_SHOW_DELAY_MS = 400;

export function createTooltip(
	parent: HTMLElement = document.body,
	showDelayMs: number = DEFAULT_SHOW_DELAY_MS,
): Tooltip {
	const element = document.createElement('div');
	element.className = 'ytph-tooltip';
	element.setAttribute('role', 'tooltip');
	element.hidden = true;
	parent.appendChild(element);

	let pending: ReturnType<typeof setTimeout> | undefined;

	function render(anchor: Element, lines: readonly string[]): void {
		const text = lines.filter((line) => line.length > 0).join('\n');
		if (text === '') return;

		element.textContent = text;
		element.hidden = false;

		const target = anchor.getBoundingClientRect();
		const self = element.getBoundingClientRect();
		const left = clamp(
			target.left + target.width / 2 - self.width / 2,
			VIEWPORT_MARGIN,
			window.innerWidth - self.width - VIEWPORT_MARGIN,
		);
		const above = target.top - self.height - EDGE_GAP;
		element.style.left = `${left}px`;
		element.style.top = `${above < VIEWPORT_MARGIN ? target.bottom + EDGE_GAP : above}px`;
	}

	function show(anchor: Element, lines: readonly string[]): void {
		clearTimeout(pending);
		if (showDelayMs <= 0) {
			render(anchor, lines);
			return;
		}
		pending = setTimeout(() => {
			render(anchor, lines);
		}, showDelayMs);
	}

	function hide(): void {
		clearTimeout(pending);
		pending = undefined;
		element.hidden = true;
	}

	function destroy(): void {
		clearTimeout(pending);
		element.remove();
	}

	return { show, hide, destroy };
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), Math.max(min, max));
