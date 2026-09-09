// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTooltip } from './tooltip';

afterEach(() => {
	document.body.innerHTML = '';
	vi.useRealTimers();
});

const anchorEl = (): HTMLElement => {
	const el = document.createElement('div');
	document.body.appendChild(el);
	return el;
};
const tipEl = () => document.querySelector<HTMLElement>('.ytph-tooltip');

describe('createTooltip', () => {
	it('renders lines as text, never as markup', () => {
		const tip = createTooltip(document.body, 0);
		tip.show(anchorEl(), ['0:00  <img src=x onerror=alert(1)>', 'safe line']);

		expect(tipEl()?.querySelector('img')).toBeNull();
		expect(tipEl()?.textContent).toBe('0:00  <img src=x onerror=alert(1)>\nsafe line');
		expect(tipEl()?.hidden).toBe(false);
	});

	it('ignores an all-empty line set', () => {
		const tip = createTooltip(document.body, 0);
		tip.show(anchorEl(), ['', '']);
		expect(tipEl()?.hidden).toBe(true);
	});

	it('hides and destroys', () => {
		const tip = createTooltip(document.body, 0);
		tip.show(anchorEl(), ['x']);
		tip.hide();
		expect(tipEl()?.hidden).toBe(true);
		tip.destroy();
		expect(tipEl()).toBeNull();
	});

	it('waits for the show delay, and hide cancels a pending show', () => {
		vi.useFakeTimers();
		const tip = createTooltip(document.body, 400);
		const anchor = anchorEl();

		tip.show(anchor, ['later']);
		vi.advanceTimersByTime(399);
		expect(tipEl()?.hidden).toBe(true);
		vi.advanceTimersByTime(1);
		expect(tipEl()?.hidden).toBe(false);

		tip.hide();
		tip.show(anchor, ['again']);
		tip.hide();
		vi.advanceTimersByTime(400);
		expect(tipEl()?.hidden).toBe(true);
	});
});
