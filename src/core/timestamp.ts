/**
 * Timestamp <-> seconds conversion. Pure, DOM-free.
 *
 * Parsing is lenient (`"1:2:3"` -> `3723`); `formatSeconds` re-canonicalises, so
 * `formatSeconds(toSeconds(x))` normalises any accepted spelling.
 */

/**
 * Parse a `M:SS` or `H:MM:SS` timestamp into seconds.
 * Returns `null` for anything that is not a plausible timestamp.
 */
export function toSeconds(stamp: string): number | null {
	const parts = stamp.split(':');
	if (parts.length < 2 || parts.length > 3) return null;

	const values = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : Number.NaN));
	if (values.some((value) => !Number.isFinite(value))) return null;

	// Every field after the first counts a base-60 unit, so it must be 0–59.
	if (values.slice(1).some((value) => value > 59)) return null;

	return values.reduce((total, value) => total * 60 + value, 0);
}

/**
 * Format seconds as `M:SS`, or `H:MM:SS` once there is at least an hour.
 * Negative / non-finite input formats as `"0:00"`.
 */
export function formatSeconds(totalSeconds: number): string {
	const total = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = String(total % 60).padStart(2, '0');

	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
		: `${minutes}:${seconds}`;
}
