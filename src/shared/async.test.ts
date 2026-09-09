import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { throttle, waitFor, waitForStableCount } from './async';

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe('waitFor', () => {
	it('resolves with the first non-nullish probe result', async () => {
		let calls = 0;
		const promise = waitFor(() => (++calls >= 3 ? 'ready' : null), { intervalMs: 100 });
		await vi.advanceTimersByTimeAsync(250);
		await expect(promise).resolves.toBe('ready');
		expect(calls).toBe(3);
	});

	it('rejects on timeout', async () => {
		const promise = waitFor(() => null, { intervalMs: 50, timeoutMs: 120 });
		const assertion = expect(promise).rejects.toThrow(/timed out/);
		await vi.advanceTimersByTimeAsync(200);
		await assertion;
	});

	it('rejects when the signal is already aborted', async () => {
		const promise = waitFor(() => 'x', { signal: AbortSignal.abort() });
		await expect(promise).rejects.toThrow(/aborted/i);
	});
});

describe('waitForStableCount', () => {
	it('resolves once the count stops changing', async () => {
		const values = [1, 2, 4, 4, 4, 4];
		let i = 0;
		const promise = waitForStableCount(() => values[Math.min(i++, values.length - 1)] ?? 0, {
			stableChecks: 3,
			intervalMs: 10,
		});
		await vi.advanceTimersByTimeAsync(100);
		await expect(promise).resolves.toBe(4);
	});

	it('resolves with the last count on timeout if it reached minCount', async () => {
		let n = 0;
		const promise = waitForStableCount(() => ++n, {
			minCount: 1,
			stableChecks: 5,
			intervalMs: 10,
			timeoutMs: 45,
		});
		await vi.advanceTimersByTimeAsync(100);
		await expect(promise).resolves.toBeGreaterThanOrEqual(1);
	});
});

describe('throttle', () => {
	it('runs immediately, then coalesces a trailing call', () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);
		throttled(1);
		throttled(2);
		throttled(3);
		expect(fn.mock.calls).toEqual([[1]]);
		vi.advanceTimersByTime(100);
		expect(fn.mock.calls).toEqual([[1], [3]]);
	});
});
