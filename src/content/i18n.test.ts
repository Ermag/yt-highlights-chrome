import { afterEach, describe, expect, it, vi } from 'vitest';
import { extensionName, t } from './i18n';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('t', () => {
	it('falls back to English when chrome.i18n is unavailable', () => {
		vi.stubGlobal('chrome', undefined);
		expect(t('previousHighlight')).toBe('Previous highlight');
		expect(t('toggleHighlights')).toBe('Toggle highlights');
	});

	it('uses chrome.i18n when it returns a value', () => {
		vi.stubGlobal('chrome', {
			i18n: { getMessage: (key: string) => (key === 'nextHighlight' ? 'Suivant' : '') },
		});
		expect(t('nextHighlight')).toBe('Suivant');
		expect(t('previousHighlight')).toBe('Previous highlight');
	});
});

describe('extensionName', () => {
	it('reads the manifest name', () => {
		vi.stubGlobal('chrome', { runtime: { getManifest: () => ({ name: 'My Cool Name' }) } });
		expect(extensionName()).toBe('My Cool Name');
	});

	it('falls back when the runtime API is absent', () => {
		vi.stubGlobal('chrome', undefined);
		expect(extensionName()).toBe('Highlights for YouTube');
	});
});
