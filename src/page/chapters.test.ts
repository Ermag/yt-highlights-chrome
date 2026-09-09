// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { hasNativeChapters } from './chapters';

afterEach(() => {
	document.body.innerHTML = '';
});

function mountBar(chapterSegments: number): void {
	document.body.innerHTML = `
		<div id="movie_player"><div class="ytp-progress-bar"><div class="ytp-chapters-container"></div></div></div>`;
	const container = document.querySelector('.ytp-chapters-container')!;
	for (let i = 0; i < chapterSegments; i += 1) {
		container.appendChild(document.createElement('div'));
	}
}

describe('hasNativeChapters', () => {
	it('is false with a single whole-bar segment', () => {
		mountBar(1);
		expect(hasNativeChapters()).toBe(false);
	});

	it('is true once the bar is split into chapters', () => {
		mountBar(12);
		expect(hasNativeChapters()).toBe(true);
	});

	it('is false when the progress bar is not there yet', () => {
		expect(hasNativeChapters()).toBe(false);
	});

	it('is true when the description-chapters panel is present, even with an un-split bar', () => {
		// Pre-roll ads collapse the progress-bar segments to one child.
		mountBar(1);
		document.body.insertAdjacentHTML(
			'beforeend',
			'<ytd-engagement-panel-section-list-renderer target-id="engagement-panel-macro-markers-description-chapters"></ytd-engagement-panel-section-list-renderer>',
		);
		expect(hasNativeChapters()).toBe(true);
	});

	it('is true for YouTube auto-generated chapters', () => {
		document.body.innerHTML =
			'<ytd-engagement-panel-section-list-renderer target-id="engagement-panel-macro-markers-auto-chapters"></ytd-engagement-panel-section-list-renderer>';
		expect(hasNativeChapters()).toBe(true);
	});
});
