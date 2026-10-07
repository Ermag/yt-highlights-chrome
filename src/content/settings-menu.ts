/**
 * Best-effort checkbox inside YouTube's player settings menu, labelled with the
 * extension's name so it reads as "ours". The primary toggle is the controls
 * button; this mirrors it. YouTube re-renders the menu, so we re-insert the item
 * whenever it disappears.
 */
import { extensionName } from './i18n';
import { STAR, svgIcon } from './icons';

/** How often one menu list may push our item back to the bottom. */
const MAX_REORDERS = 5;

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

	// Opening a submenu (Quality, Sleep timer, …) swaps the root panel for one
	// with a back-button header, so only a header-less panel is the root. Keep
	// the item last: YouTube can add its own items after we mount. Reordering is
	// capped per list so we can never ping-pong with YouTube's own reordering.
	const reorders = new WeakMap<Element, number>();
	const ensureMounted = (): void => {
		const root = [...menu.querySelectorAll('.ytp-panel')].find(
			(panel) => !panel.querySelector('.ytp-panel-header'),
		);
		const list = root?.querySelector('.ytp-panel-menu');
		if (!list || list.lastElementChild === item) return;
		if (list.contains(item)) {
			const count = reorders.get(list) ?? 0;
			if (count >= MAX_REORDERS) return;
			reorders.set(list, count + 1);
		}
		list.appendChild(item);
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
