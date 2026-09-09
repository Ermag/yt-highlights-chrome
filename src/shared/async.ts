/**
 * Small async primitives for polling YouTube's lazily-rendered DOM.
 * These wrap genuinely imperative scheduler state; the disable comments mark
 * that as deliberate, not an oversight.
 */

export const noop = (): void => undefined;

export interface WaitForOptions {
	readonly intervalMs?: number;
	readonly timeoutMs?: number;
	readonly signal?: AbortSignal;
}

/** Resolve with the first non-nullish value `probe` returns; reject on timeout/abort. */
export function waitFor<T>(
	probe: () => T | null | undefined,
	options: WaitForOptions = {},
): Promise<T> {
	const { intervalMs = 200, timeoutMs = 20_000, signal } = options;
	return new Promise<T>((resolve, reject) => {
		const deadline = Date.now() + timeoutMs;
		const attempt = (): void => {
			if (signal?.aborted) {
				reject(new DOMException('waitFor aborted', 'AbortError'));
				return;
			}
			const value = probe();
			if (value !== null && value !== undefined) {
				resolve(value);
				return;
			}
			if (Date.now() >= deadline) {
				reject(new Error('waitFor: timed out'));
				return;
			}
			setTimeout(attempt, intervalMs);
		};
		attempt();
	});
}

export interface StableCountOptions {
	readonly signal?: AbortSignal;
	readonly minCount?: number;
	readonly stableChecks?: number;
	readonly intervalMs?: number;
	readonly timeoutMs?: number;
}

/**
 * Resolve once `count()` has stopped changing for `stableChecks` polls (and is at
 * least `minCount`). On timeout, resolve with the last count if it reached
 * `minCount`, otherwise reject. Used to know when comment loading has settled.
 */
export function waitForStableCount(
	count: () => number,
	options: StableCountOptions = {},
): Promise<number> {
	const {
		signal,
		minCount = 1,
		stableChecks = 3,
		intervalMs = 250,
		timeoutMs = 15_000,
	} = options;
	return new Promise<number>((resolve, reject) => {
		const deadline = Date.now() + timeoutMs;
		// eslint-disable-next-line functional/no-let -- poller state
		let previous = -1;
		// eslint-disable-next-line functional/no-let -- poller state
		let stable = 0;
		const tick = (): void => {
			if (signal?.aborted) {
				reject(new DOMException('waitForStableCount aborted', 'AbortError'));
				return;
			}
			const current = count();
			stable = current === previous ? stable + 1 : 0;
			previous = current;
			if (current >= minCount && stable >= stableChecks) {
				resolve(current);
				return;
			}
			if (Date.now() >= deadline) {
				if (current >= minCount) resolve(current);
				else reject(new Error('waitForStableCount: timed out'));
				return;
			}
			setTimeout(tick, intervalMs);
		};
		tick();
	});
}

/** Leading + trailing throttle: fires now if idle, otherwise once more with the latest args. */
export function throttle<A extends readonly unknown[]>(
	fn: (...args: A) => void,
	intervalMs: number,
): (...args: A) => void {
	// eslint-disable-next-line functional/no-let -- scheduler state
	let last = Number.NEGATIVE_INFINITY;
	// eslint-disable-next-line functional/no-let -- scheduler state
	let timer: ReturnType<typeof setTimeout> | undefined;
	// eslint-disable-next-line functional/no-let -- scheduler state
	let pending: A | undefined;

	const run = (args: A): void => {
		last = Date.now();
		fn(...args);
	};

	return (...args: A): void => {
		const elapsed = Date.now() - last;
		if (elapsed >= intervalMs) {
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
			}
			pending = undefined;
			run(args);
		} else {
			pending = args;
			timer ??= setTimeout(() => {
				timer = undefined;
				const next = pending;
				pending = undefined;
				if (next) run(next);
			}, intervalMs - elapsed);
		}
	};
}
