// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchComments } from './sources';

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = '';
});

function mountSection(): HTMLElement {
	const comments = document.createElement('ytd-comments');
	comments.id = 'comments';
	const contents = document.createElement('div');
	contents.id = 'contents';
	comments.appendChild(contents);
	document.body.appendChild(comments);
	return contents;
}

function addThread(contents: HTMLElement, ...nodes: (Node | string)[]): void {
	const thread = document.createElement('ytd-comment-thread-renderer');
	const content = document.createElement('div');
	content.id = 'content-text';
	content.append(...nodes);
	thread.appendChild(content);
	contents.appendChild(thread);
}

const watch = (signal = new AbortController().signal) => {
	const onChange = vi.fn<(comments: readonly string[]) => void>();
	watchComments(signal, onChange);
	return onChange;
};

describe('watchComments', () => {
	it('reports the stabilised, non-empty comment texts', async () => {
		const contents = mountSection();
		for (const text of ['great video 10:00 the best part', '  ', 'nice 12:30 chapter']) {
			addThread(contents, text);
		}

		const onChange = watch();
		await vi.advanceTimersByTimeAsync(3000);

		expect(onChange.mock.calls).toEqual([
			[['great video 10:00 the best part', 'nice 12:30 chapter']],
		]);
	});

	it('stays silent when comments never load', async () => {
		mountSection();
		const onChange = watch();
		await vi.advanceTimersByTimeAsync(30_000);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('picks up comments that load after the first batch settled', async () => {
		const contents = mountSection();
		addThread(contents, 'first');
		const onChange = watch();
		await vi.advanceTimersByTimeAsync(3000);

		// e.g. the user scrolls down and YouTube loads the next page.
		addThread(contents, '4:20 late but important');
		await vi.advanceTimersByTimeAsync(1000);

		expect(onChange).toHaveBeenLastCalledWith(['first', '4:20 late but important']);
	});

	it('picks up comments that only load after the nudge gave up', async () => {
		const contents = mountSection();
		const onChange = watch();
		await vi.advanceTimersByTimeAsync(30_000);

		addThread(contents, '1:00 finally');
		await vi.advanceTimersByTimeAsync(1000);

		expect(onChange.mock.calls).toEqual([[['1:00 finally']]]);
	});

	it('ignores mutations that leave the text unchanged', async () => {
		const contents = mountSection();
		addThread(contents, 'only one');
		const onChange = watch();
		await vi.advanceTimersByTimeAsync(3000);

		contents.appendChild(document.createElement('span'));
		await vi.advanceTimersByTimeAsync(1000);

		expect(onChange).toHaveBeenCalledOnce();
	});

	it('stops once aborted', async () => {
		const contents = mountSection();
		addThread(contents, 'first');
		const abort = new AbortController();
		const onChange = watch(abort.signal);
		await vi.advanceTimersByTimeAsync(3000);

		abort.abort();
		addThread(contents, 'after navigation');
		await vi.advanceTimersByTimeAsync(1000);

		expect(onChange).toHaveBeenCalledOnce();
	});

	it('reads emoji rendered as <img alt> (YouTube drops them from textContent)', async () => {
		addThread(mountSection(), '3:30 ', Object.assign(new Image(), { alt: '😂' }));
		const onChange = watch();
		await vi.advanceTimersByTimeAsync(3000);
		expect(onChange).toHaveBeenCalledWith(['3:30 😂']);
	});
});
