// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../core';
import { createMarkers } from './markers';
import type { Tooltip } from './tooltip';

const h = (seconds: number, ...labels: string[]): Highlight => ({
	seconds,
	stamp: String(seconds),
	labels,
	sources: ['description'],
});

const fakeTooltip = (): Tooltip => ({ show: vi.fn(), hide: vi.fn(), destroy: vi.fn() });

const buttons = (root: HTMLElement) => [
	...root.querySelectorAll<HTMLButtonElement>('button.ytph-marker'),
];

describe('createMarkers', () => {
	it('renders one positioned button per highlight', () => {
		const { element } = createMarkers({
			highlights: [h(0, 'Intro'), h(300, 'Middle'), h(600, 'End')],
			durationSeconds: 600,
			onSeek: vi.fn(),
			tooltip: fakeTooltip(),
		});
		const marks = buttons(element);
		expect(marks.map((m) => m.style.left)).toEqual(['0%', '50%', '100%']);
		expect(marks[1]?.getAttribute('aria-label')).toBe('300  Middle');
	});

	it('collapses near-coincident highlights into one marker', () => {
		const { element } = createMarkers({
			highlights: [h(0, 'A'), h(2, 'B'), h(590, 'C')],
			durationSeconds: 600,
			onSeek: vi.fn(),
			tooltip: fakeTooltip(),
		});
		const marks = buttons(element);
		expect(marks).toHaveLength(2);
		expect(marks[0]?.getAttribute('aria-label')).toBe('0  A; 2  B');
	});

	it('widens markers when sparse, narrows them when clusters are tight', () => {
		const opts = { durationSeconds: 6000, onSeek: vi.fn(), tooltip: fakeTooltip() };
		const widthOf = (m: ReturnType<typeof createMarkers>) =>
			Number.parseInt(m.element.style.getPropertyValue('--ytph-marker-width'), 10);

		// two highlights 50% apart -> huge gap -> clamped to the max
		expect(widthOf(createMarkers({ ...opts, highlights: [h(0, 'A'), h(3000, 'B')] }))).toBe(6);

		// clusters ~1% apart on a 640px bar (~6px gap) -> a thin marker
		const tight = widthOf(
			createMarkers({
				...opts,
				highlights: [h(0, 'A'), h(60, 'B'), h(5000, 'C')],
				progressBarWidthPx: 640,
			}),
		);
		expect(tight).toBeGreaterThanOrEqual(3);
		expect(tight).toBeLessThan(6);
	});

	it('clusters by pixels: a wider progress bar keeps closer markers apart', () => {
		const near = { highlights: [h(0, 'A'), h(3, 'B')], durationSeconds: 600, onSeek: vi.fn() };
		expect(buttons(createMarkers({ ...near, tooltip: fakeTooltip() }).element)).toHaveLength(1);
		expect(
			buttons(
				createMarkers({ ...near, tooltip: fakeTooltip(), progressBarWidthPx: 4000 })
					.element,
			),
		).toHaveLength(2);
	});

	it('seeks to the cluster start on click, without leaking the event to the progress bar', () => {
		const onSeek = vi.fn();
		const parentClick = vi.fn();
		const { element } = createMarkers({
			highlights: [h(0, 'A'), h(300, 'B')],
			durationSeconds: 600,
			onSeek,
			tooltip: fakeTooltip(),
		});
		const host = document.createElement('div');
		host.addEventListener('click', parentClick);
		host.addEventListener('mousedown', parentClick);
		host.appendChild(element);

		buttons(element)[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		buttons(element)[1]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

		expect(onSeek).toHaveBeenCalledWith(300);
		expect(parentClick).not.toHaveBeenCalled();
	});

	it('never puts label markup in the DOM', () => {
		const { element } = createMarkers({
			highlights: [h(0, '<img src=x onerror=alert(1)>')],
			durationSeconds: 600,
			onSeek: vi.fn(),
			tooltip: fakeTooltip(),
		});
		expect(element.querySelector('img')).toBeNull();
		expect(buttons(element)[0]?.getAttribute('aria-label')).toContain('onerror');
	});

	it('shows the tooltip on hover and focus', () => {
		const tooltip = fakeTooltip();
		const { element } = createMarkers({
			highlights: [h(0, 'A')],
			durationSeconds: 600,
			onSeek: vi.fn(),
			tooltip,
		});
		buttons(element)[0]?.dispatchEvent(new MouseEvent('mouseenter'));
		expect(tooltip.show).toHaveBeenCalledWith(expect.anything(), ['0  A']);
		buttons(element)[0]?.dispatchEvent(new MouseEvent('mouseleave'));
		expect(tooltip.hide).toHaveBeenCalled();
	});

	it('toggles visibility and cleans up', () => {
		const tooltip = fakeTooltip();
		const markers = createMarkers({
			highlights: [h(0, 'A')],
			durationSeconds: 600,
			onSeek: vi.fn(),
			tooltip,
		});
		document.body.appendChild(markers.element);
		markers.setVisible(false);
		expect(markers.element.hidden).toBe(true);
		markers.destroy();
		expect(document.body.contains(markers.element)).toBe(false);
		expect(tooltip.hide).toHaveBeenCalled();
	});
});
