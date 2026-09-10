// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../core';
import { scrollToSourceComment } from './comments';

const h = (seconds: number, label: string): Highlight => ({
	seconds,
	stamp: String(seconds),
	labels: label ? [label] : [],
	sources: ['comment'],
});

/** One `ytd-comment-thread-renderer` with the given content text (timestamps as
 *  `<a href="…&t=Ns">` the way YouTube renders them). */
function thread(html: string): string {
	return `<ytd-comment-thread-renderer><div id="content-text">${html}</div></ytd-comment-thread-renderer>`;
}

function mountComments(...threads: string[]): void {
	document.body.innerHTML = `<ytd-comments id="comments"><div id="contents">${threads.join('')}</div></ytd-comments>`;
}

let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
	scrollIntoView = vi.fn();
	Element.prototype.scrollIntoView =
		scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
	vi.useFakeTimers();
});

afterEach(() => {
	document.body.innerHTML = '';
	vi.useRealTimers();
});

const threads = () => [...document.querySelectorAll('ytd-comment-thread-renderer')];

describe('scrollToSourceComment', () => {
	it('scrolls the thread linking to that timestamp into view and flashes it', () => {
		mountComments(
			thread('nice video'),
			thread('<a href="/watch?v=x&t=87s">1:27</a> the tangent about Lisp'),
		);

		expect(scrollToSourceComment(h(87, 'the tangent about Lisp'))).toBe(true);

		const target = threads()[1]!;
		expect(scrollIntoView).toHaveBeenCalledOnce();
		expect(scrollIntoView.mock.instances[0]).toBe(target);
		expect(target.classList.contains('ytph-comment-flash')).toBe(true);

		vi.advanceTimersByTime(2000);
		expect(target.classList.contains('ytph-comment-flash')).toBe(false);
	});

	it('disambiguates by label text when several comments link the same timestamp', () => {
		mountComments(
			thread('<a href="/watch?v=x&t=87s">1:27</a> first thoughts'),
			thread('<a href="/watch?v=x&t=87s">1:27</a> the tangent about Lisp'),
		);

		scrollToSourceComment(h(87, 'the tangent about Lisp'));
		expect(scrollIntoView.mock.instances[0]).toBe(threads()[1]);
	});

	it('falls back to a text match when the timestamp is not linkified', () => {
		mountComments(thread('skip to 1:27 for the good part'));

		// The label is the whole comment line minus the stamp — what buildHighlights produces.
		expect(scrollToSourceComment(h(87, 'skip to for the good part'))).toBe(true);
		expect(scrollIntoView.mock.instances[0]).toBe(threads()[0]);
	});

	it('scrolls the comments section into view and returns false when nothing matches', () => {
		mountComments(thread('unrelated'), thread('also unrelated'));

		expect(scrollToSourceComment(h(87, 'missing comment'))).toBe(false);
		expect(scrollIntoView.mock.instances[0]).toBe(
			document.querySelector('ytd-comments#comments'),
		);
	});

	it('returns false when there is no comments container at all', () => {
		document.body.innerHTML = '';
		expect(scrollToSourceComment(h(87, 'anything'))).toBe(false);
		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
