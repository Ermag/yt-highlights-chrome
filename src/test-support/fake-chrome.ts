/** Minimal in-memory `chrome.storage.local` double for tests. */
type ChangeListener = (
	changes: Record<string, chrome.storage.StorageChange>,
	areaName: string,
) => void;

export function fakeChrome(): typeof chrome {
	const data: Record<string, unknown> = {};
	const listeners: ChangeListener[] = [];

	const local = {
		get: (key: string) => Promise.resolve({ [key]: data[key] }),
		set: (items: Record<string, unknown>) => {
			Object.assign(data, items);
			const changes = Object.fromEntries(
				Object.entries(items).map(([k, v]) => [k, { newValue: v }]),
			);
			for (const listener of listeners) listener(changes, 'local');
			return Promise.resolve();
		},
	};

	return {
		storage: {
			local,
			onChanged: {
				addListener: (l: ChangeListener) => listeners.push(l),
				removeListener: (l: ChangeListener) => {
					const i = listeners.indexOf(l);
					if (i >= 0) listeners.splice(i, 1);
				},
			},
		},
	} as unknown as typeof chrome;
}
