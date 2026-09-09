// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	onContentMessage,
	onPageMessage,
	sendToContent,
	sendToPage,
	type ContentMessage,
	type PageMessage,
} from './protocol';

const cleanups: (() => void)[] = [];
afterEach(() => {
	cleanups.splice(0).forEach((off) => {
		off();
	});
});
const track = (off: () => void): void => {
	cleanups.push(off);
};

describe('protocol bus', () => {
	it('delivers a page message to a content-side listener', () => {
		const received: PageMessage[] = [];
		track(onPageMessage((message) => received.push(message)));

		const state = {
			videoId: 'v1',
			durationSeconds: 42,
			isLive: false,
			description: '0:00 hi',
			hasNativeChapters: false,
		};
		sendToContent({ kind: 'player-state', state });

		expect(received).toEqual([{ kind: 'player-state', state }]);
	});

	it('delivers a content message to a page-side listener', () => {
		const received: ContentMessage[] = [];
		track(onContentMessage((message) => received.push(message)));

		sendToPage({ kind: 'seek', seconds: 90 });
		sendToPage({ kind: 'query-player' });

		expect(received).toEqual([{ kind: 'seek', seconds: 90 }, { kind: 'query-player' }]);
	});

	it('keeps the two directions separate', () => {
		const pageSide: ContentMessage[] = [];
		track(onContentMessage((message) => pageSide.push(message)));

		sendToContent({ kind: 'player-gone' });

		expect(pageSide).toEqual([]);
	});

	it('stops delivering after the returned unsubscribe is called', () => {
		const received: PageMessage[] = [];
		const off = onPageMessage((message) => received.push(message));
		off();

		sendToContent({ kind: 'player-gone' });

		expect(received).toEqual([]);
	});

	it('ignores malformed or spoofed events without throwing', () => {
		const received: PageMessage[] = [];
		track(onPageMessage((message) => received.push(message)));
		const onError = vi.fn();
		window.addEventListener('error', onError);

		document.dispatchEvent(new CustomEvent('ytph:page', { detail: '{not json' }));
		document.dispatchEvent(new CustomEvent('ytph:page', { detail: 123 as unknown as string }));
		document.dispatchEvent(new CustomEvent('ytph:page'));

		expect(received).toEqual([]);
		expect(onError).not.toHaveBeenCalled();
		window.removeEventListener('error', onError);
	});
});
