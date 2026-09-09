/**
 * Content script — ISOLATED world entry point.
 *
 * Owns orchestration and all DOM the extension adds: progress-bar markers,
 * player controls, the settings toggle, and the per-video lifecycle. Talks to
 * the MAIN-world bridge (src/page) over a private CustomEvent channel.
 */
import { start } from './app';

void start();

console.debug('[ytph] content script ready');
