// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readComments } from './sources';

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = '';
});

function mountComments(texts: readonly string[]): void {
	const comments = document.createElement('ytd-comments');
	comments.id = 'comments';
	const contents = document.createElement('div');
	contents.id = 'contents';
	comments.appendChild(contents);
	document.body.appendChild(comments);
	for (const text of texts) {
		const thread = document.createElement('ytd-comment-thread-renderer');
		const content = document.createElement('div');
		content.id = 'content-text';
		content.textContent = text;
		thread.appendChild(content);
		contents.appendChild(thread);
	}
}

describe('readComments', () => {
	it('returns the stabilised, non-empty comment texts', async () => {
		mountComments(['great video 10:00 the best part', '  ', 'nice 12:30 chapter']);

		const promise = readComments(new AbortController().signal);
		await vi.advanceTimersByTimeAsync(3000);

		await expect(promise).resolves.toEqual([
			'great video 10:00 the best part',
			'nice 12:30 chapter',
		]);
	});

	it('resolves to [] when comments never load', async () => {
		const promise = readComments(new AbortController().signal);
		await vi.advanceTimersByTimeAsync(20_000);
		await expect(promise).resolves.toEqual([]);
	});

	it('reads emoji rendered as <img alt> (YouTube drops them from textContent)', async () => {
		const comments = document.createElement('ytd-comments');
		comments.id = 'comments';
		const contents = document.createElement('div');
		contents.id = 'contents';
		comments.appendChild(contents);
		document.body.appendChild(comments);

		const thread = document.createElement('ytd-comment-thread-renderer');
		const content = document.createElement('div');
		content.id = 'content-text';
		content.append(document.createTextNode('3:30 '), Object.assign(new Image(), { alt: '😂' }));
		thread.appendChild(content);
		contents.appendChild(thread);

		const promise = readComments(new AbortController().signal);
		await vi.advanceTimersByTimeAsync(3000);
		await expect(promise).resolves.toEqual(['3:30 😂']);
	});
});
