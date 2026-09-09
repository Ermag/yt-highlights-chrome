/**
 * Persisted settings, in `chrome.storage.local` (v3 used the youtube.com-origin
 * `localStorage`, which leaked into YouTube's namespace). Degrades to defaults
 * when the storage API is unavailable (tests, non-extension contexts).
 */
import { noop } from '../shared/async';

export interface Settings {
	readonly enabled: boolean;
}

const DEFAULTS: Settings = { enabled: true };
const KEY = 'settings';

const local = (): chrome.storage.StorageArea | undefined => globalThis.chrome?.storage?.local;

function coerce(value: unknown): Settings {
	if (typeof value !== 'object' || value === null) return DEFAULTS;
	const enabled = (value as { enabled?: unknown }).enabled;
	return { enabled: typeof enabled === 'boolean' ? enabled : DEFAULTS.enabled };
}

export async function getSettings(): Promise<Settings> {
	const area = local();
	if (!area) return DEFAULTS;
	const record: Record<string, unknown> = await area.get(KEY);
	return coerce(record[KEY]);
}

export async function setEnabled(enabled: boolean): Promise<void> {
	const area = local();
	if (!area) return;
	const current = await getSettings();
	await area.set({ [KEY]: { ...current, enabled } });
}

export function onSettingsChanged(handler: (settings: Settings) => void): () => void {
	const storage = globalThis.chrome?.storage;
	if (!storage) return noop;

	const listener = (
		changes: Record<string, chrome.storage.StorageChange>,
		areaName: string,
	): void => {
		const change: { newValue?: unknown } | undefined = changes[KEY];
		if (areaName === 'local' && change) {
			handler(coerce(change.newValue));
		}
	};
	storage.onChanged.addListener(listener);
	return () => {
		storage.onChanged.removeListener(listener);
	};
}
