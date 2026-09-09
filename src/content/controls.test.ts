// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../core';
import { createControls } from './controls';
import type { Tooltip } from './tooltip';

const h = (seconds: number, label: string): Highlight => ({
	seconds,
	stamp: String(seconds),
	labels: [label],
});

const fakeTooltip = (): Tooltip => ({ show: vi.fn(), hide: vi.fn(), destroy: vi.fn() });

const opts = (over: Partial<Parameters<typeof createControls>[0]> = {}) => ({
	highlights: [h(0, 'A'), h(100, 'B'), h(200, 'C')],
	onSeek: vi.fn(),
	onToggle: vi.fn(),
	tooltip: fakeTooltip(),
	...over,
});

function mockCurrentTime(seconds: number): void {
	document.body.innerHTML = '<div id="movie_player"><video></video></div>';
	const video = document.querySelector('#movie_player video')!;
	Object.defineProperty(video, 'currentTime', { value: seconds, configurable: true });
}

afterEach(() => {
	document.body.innerHTML = '';
	vi.useRealTimers();
});

const q = <E extends Element>(root: Element, sel: string) => root.querySelector<E>(sel);
const click = (el: Element | null) => el?.dispatchEvent(new MouseEvent('click'));
const seeks = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.map((c) => c[0] as number);

describe('createControls', () => {
	it('labels its buttons for assistive tech', () => {
		const { element } = createControls(opts());
		expect(q(element, '.ytph-prev')?.getAttribute('aria-label')).toBe('Previous highlight');
		expect(q(element, '.ytph-next')?.getAttribute('aria-label')).toBe('Next highlight');
		expect(q(element, '.ytph-toggle')?.getAttribute('aria-label')).toBe('Toggle highlights');
	});

	it('shows the active highlight in the label, hidden when there is none', () => {
		const { element, update } = createControls(opts());

		update(150);
		expect(q(element, '.ytph-label')?.textContent).toBe('B');
		expect(q<HTMLElement>(element, '.ytph-label')?.hidden).toBe(false);

		update(250);
		expect(q(element, '.ytph-label')?.textContent).toBe('C');

		update(-1);
		expect(q(element, '.ytph-label')?.textContent).toBe('');
		expect(q<HTMLElement>(element, '.ytph-label')?.hidden).toBe(true);
	});

	it('never disables the buttons and wraps at both ends', () => {
		const onSeek = vi.fn();
		const { element } = createControls(opts({ highlights: [h(0, 'A'), h(100, 'B')], onSeek }));
		expect(q<HTMLButtonElement>(element, '.ytph-prev')?.disabled).toBe(false);
		expect(q<HTMLButtonElement>(element, '.ytph-next')?.disabled).toBe(false);

		mockCurrentTime(150); // past the last highlight
		click(q(element, '.ytph-next'));
		expect(onSeek).toHaveBeenLastCalledWith(0);

		mockCurrentTime(0); // at the first highlight
		click(q(element, '.ytph-prev'));
		expect(onSeek).toHaveBeenLastCalledWith(100);
	});

	it('rapid prev/next presses step through highlights instead of sticking', () => {
		const onSeek = vi.fn();
		const { element } = createControls(
			opts({ highlights: [h(0, 'A'), h(100, 'B'), h(200, 'C'), h(300, 'D')], onSeek }),
		);
		mockCurrentTime(250); // section C; playhead never updates (simulates a playing seek lag)

		const prev = q(element, '.ytph-prev');
		click(prev);
		click(prev);
		click(prev);
		expect(seeks(onSeek)).toEqual([200, 100, 0]);
	});

	it('lets the anchor expire so later presses use the live playhead', () => {
		vi.useFakeTimers();
		const onSeek = vi.fn();
		const { element } = createControls(
			opts({ highlights: [h(0, 'A'), h(100, 'B'), h(200, 'C')], onSeek }),
		);
		mockCurrentTime(150);
		click(q(element, '.ytph-next')); // -> 200, anchor = 200
		vi.advanceTimersByTime(1500); // anchor expires
		click(q(element, '.ytph-next')); // from live 150 -> 200 again (not wrapped from anchor 200)
		expect(seeks(onSeek)).toEqual([200, 200]);
	});

	it('routes the toggle button to onToggle and reflects state', () => {
		const onToggle = vi.fn();
		const { element, setEnabledState } = createControls(opts({ onToggle }));
		click(q(element, '.ytph-toggle'));
		expect(onToggle).toHaveBeenCalledOnce();

		setEnabledState(false);
		expect(element.classList.contains('ytph-off')).toBe(true);
		expect(q(element, '.ytph-toggle')?.getAttribute('aria-pressed')).toBe('false');
	});

	it('shows the full label in a tooltip only when it is truncated', () => {
		const tooltip = fakeTooltip();
		const { element, update } = createControls(opts({ tooltip }));
		document.body.appendChild(element);
		const label = q<HTMLElement>(element, '.ytph-label')!;

		update(0);
		label.dispatchEvent(new MouseEvent('mouseenter'));
		expect(tooltip.show).not.toHaveBeenCalled();

		update(100);
		Object.defineProperty(label, 'scrollWidth', { value: 999, configurable: true });
		Object.defineProperty(label, 'clientWidth', { value: 100, configurable: true });
		label.dispatchEvent(new MouseEvent('mouseenter'));
		expect(tooltip.show).toHaveBeenCalledWith(label, ['B']);

		label.dispatchEvent(new MouseEvent('mouseleave'));
		expect(tooltip.hide).toHaveBeenCalled();
	});
});
