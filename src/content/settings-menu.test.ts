// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { mountSettingsMenuItem } from './settings-menu';

afterEach(() => {
	document.body.innerHTML = '';
});

const div = (className: string, ...children: Node[]): HTMLDivElement => {
	const el = document.createElement('div');
	el.className = className;
	el.append(...children);
	return el;
};

/** A `.ytp-panel` like YouTube's: submenus carry a back-button header. */
const panel = (itemCount: number, withHeader = false): HTMLDivElement => {
	const items = Array.from({ length: itemCount }, () => div('ytp-menuitem'));
	const list = div('ytp-panel-menu', ...items);
	return withHeader ? div('ytp-panel', div('ytp-panel-header'), list) : div('ytp-panel', list);
};

const settingsMenu = (...panels: HTMLElement[]): HTMLDivElement => {
	const menu = div('ytp-settings-menu', div('ytp-popup-content', ...panels));
	document.body.appendChild(menu);
	return menu;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ourItem = () => document.querySelector('.ytph-menuitem');

describe('mountSettingsMenuItem', () => {
	it('appends the item at the bottom of the root panel', () => {
		const root = panel(3);
		mountSettingsMenuItem(settingsMenu(root), { checked: true, onToggle: () => {} });

		const list = root.querySelector('.ytp-panel-menu');
		expect(list?.lastElementChild).toBe(ourItem());
		expect(list?.children).toHaveLength(4);
	});

	it('stays out of a submenu panel', async () => {
		const root = panel(3);
		const menu = settingsMenu(root);
		mountSettingsMenuItem(menu, { checked: true, onToggle: () => {} });
		const item = ourItem();

		// YouTube replaces the root panel with the submenu's.
		const sub = panel(5, true);
		root.replaceWith(sub);
		await flush();

		expect(sub.querySelector('.ytph-menuitem')).toBeNull();
		expect(root.contains(item)).toBe(true);
	});

	it('ignores a submenu that renders before the root panel', () => {
		const sub = panel(2, true);
		const root = panel(3);
		mountSettingsMenuItem(settingsMenu(sub, root), { checked: false, onToggle: () => {} });

		expect(sub.contains(ourItem())).toBe(false);
		expect(root.querySelector('.ytp-panel-menu')?.lastElementChild).toBe(ourItem());
	});

	it('moves back to the bottom when YouTube appends items later', async () => {
		const root = panel(2);
		mountSettingsMenuItem(settingsMenu(root), { checked: true, onToggle: () => {} });

		const list = root.querySelector('.ytp-panel-menu');
		list?.appendChild(div('ytp-menuitem'));
		await flush();

		expect(list?.lastElementChild).toBe(ourItem());
	});

	it('remounts into a freshly built root panel', async () => {
		const root = panel(3);
		mountSettingsMenuItem(settingsMenu(root), { checked: true, onToggle: () => {} });

		const rebuilt = panel(4);
		root.replaceWith(rebuilt);
		await flush();

		expect(rebuilt.querySelector('.ytp-panel-menu')?.lastElementChild).toBe(ourItem());
	});
});
