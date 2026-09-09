// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readDescription } from './description';

interface WithText extends HTMLElement {
	text?: { content?: string };
}

afterEach(() => {
	document.body.innerHTML = '';
	delete (window as { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse;
});

describe('readDescription', () => {
	it('prefers the Polymer .text.content (the un-truncated source)', () => {
		const el = document.createElement('div') as WithText;
		el.id = 'description-inline-expander';
		el.textContent = '0:00 Intro'; // truncated view
		el.text = { content: '0:00 Intro\n5:00 Middle\n10:00 End' }; // full text
		document.body.appendChild(el);

		expect(readDescription('vid1')).toBe('0:00 Intro\n5:00 Middle\n10:00 End');
	});

	it('falls back to ytInitialPlayerResponse when the id matches', () => {
		(window as { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse = {
			videoDetails: { videoId: 'vid1', shortDescription: 'full text 1:00 chapter' },
		};
		expect(readDescription('vid1')).toBe('full text 1:00 chapter');
		expect(readDescription('other')).toBe('');
	});

	it('falls back to textContent as a last resort', () => {
		const el = document.createElement('div');
		el.id = 'description-inline-expander';
		el.textContent = '  0:00 partial  ';
		document.body.appendChild(el);
		expect(readDescription('vid1')).toBe('0:00 partial');
	});
});
