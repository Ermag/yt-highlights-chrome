/**
 * Best-effort checkbox inside YouTube's player settings menu, labelled with the
 * extension's name so it reads as "ours". The primary toggle is the controls
 * button; this mirrors it. YouTube re-renders the menu, so we re-insert the item
 * whenever it disappears.
 */
import { extensionName } from './i18n';
import { STAR, svgIcon } from './icons';

export interface SettingsMenuOptions {
	readonly checked: boolean;
	readonly onToggle: () => void;
}

export interface SettingsMenuItem {
	setChecked: (checked: boolean) => void;
	destroy: () => void;
}

export function mountSettingsMenuItem(
	menu: Element,
	options: SettingsMenuOptions,
): SettingsMenuItem {
	const item = buildItem(options.checked, options.onToggle);

	const ensureMounted = (): void => {
		const panel = menu.querySelector('.ytp-panel-menu');
		if (panel && !panel.contains(item)) {
			panel.insertBefore(item, panel.firstChild);
		}
	};

	const observer = new MutationObserver(ensureMounted);
	observer.observe(menu, { childList: true, subtree: true });
	ensureMounted();

	return {
		setChecked: (checked) => {
			item.setAttribute('aria-checked', String(checked));
		},
		destroy: () => {
			observer.disconnect();
			item.remove();
		},
	};
}

function buildItem(checked: boolean, onToggle: () => void): HTMLElement {
	const item = document.createElement('div');
	item.className = 'ytp-menuitem ytph-menuitem';
	item.setAttribute('role', 'menuitemcheckbox');
	item.setAttribute('aria-checked', String(checked));
	item.tabIndex = 0;

	const iconCell = cell('ytp-menuitem-icon');
	iconCell.appendChild(svgIcon(STAR, '0 0 24 24', 24));
	const labelCell = cell('ytp-menuitem-label');
	labelCell.textContent = extensionName();
	const contentCell = cell('ytp-menuitem-content');
	contentCell.appendChild(cell('ytp-menuitem-toggle-checkbox'));
	item.append(iconCell, labelCell, contentCell);

	item.addEventListener('click', onToggle);
	item.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggle();
		}
	});
	return item;
}

const cell = (className: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.className = className;
	return el;
};
