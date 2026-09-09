// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readElementText } from './dom-text';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('readElementText', () => {
	it('substitutes an emoji <img alt> that textContent would drop', () => {
		const el = document.createElement('div');
		// how YouTube renders "3:30 😂😂😂"
		el.append(document.createTextNode('3:30 '), emojiImg('😂'), emojiImg('😂'), emojiImg('😂'));
		document.body.appendChild(el);

		expect(el.textContent).toBe('3:30 '); // the bug
		expect(readElementText(el)).toBe('3:30 😂😂😂');
	});

	it('falls back to aria-label, then empty', () => {
		const withAria = document.createElement('img');
		withAria.setAttribute('aria-label', '❤');
		const bare = document.createElement('img');
		const wrap = document.createElement('span');
		wrap.append(document.createTextNode('a'), withAria, bare, document.createTextNode('b'));
		expect(readElementText(wrap)).toBe('a❤b');
	});

	it('walks nested nodes', () => {
		const el = document.createElement('div');
		el.innerHTML = '<span>0:00 <b>Intro</b> </span><span><i>done</i></span>';
		el.querySelector('b')?.after(emojiImg('🔥'));
		expect(readElementText(el)).toBe('0:00 Intro🔥 done');
	});

	it('returns "" for null', () => {
		expect(readElementText(null)).toBe('');
	});
});

function emojiImg(alt: string): HTMLImageElement {
	const img = document.createElement('img');
	img.alt = alt;
	return img;
}
