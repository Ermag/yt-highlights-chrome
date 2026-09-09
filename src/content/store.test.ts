import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeChrome } from '../test-support/fake-chrome';
import { getSettings, onSettingsChanged, setEnabled } from './store';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('store', () => {
	it('returns defaults when chrome.storage is missing', async () => {
		vi.stubGlobal('chrome', undefined);
		expect(await getSettings()).toEqual({ enabled: true });
	});

	it('round-trips the enabled flag', async () => {
		vi.stubGlobal('chrome', fakeChrome());
		expect(await getSettings()).toEqual({ enabled: true });
		await setEnabled(false);
		expect(await getSettings()).toEqual({ enabled: false });
	});

	it('notifies listeners on change and stops after unsubscribe', async () => {
		vi.stubGlobal('chrome', fakeChrome());
		const seen: boolean[] = [];
		const off = onSettingsChanged((s) => seen.push(s.enabled));

		await setEnabled(false);
		await setEnabled(true);
		off();
		await setEnabled(false);

		expect(seen).toEqual([false, true]);
	});
});
