/**
 * `chrome.i18n` lookups with a built-in English fallback for contexts where the
 * extension i18n API is absent (unit tests, the preview simulation).
 */
const MESSAGES = {
	previousHighlight: 'Previous highlight',
	nextHighlight: 'Next highlight',
	toggleHighlights: 'Toggle highlights',
	showHighlights: 'Show highlights',
	hideHighlights: 'Hide highlights',
	openSourceComment: 'Go to comment',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function t(key: MessageKey): string {
	const localized = globalThis.chrome?.i18n?.getMessage(key);
	return localized && localized.length > 0 ? localized : MESSAGES[key];
}

const DEFAULT_NAME = 'Highlights for YouTube';

/** The extension's display name — the manifest's `name`, so it matches the store listing. */
export function extensionName(): string {
	return globalThis.chrome?.runtime?.getManifest?.().name || DEFAULT_NAME;
}
