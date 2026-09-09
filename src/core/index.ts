/** Public surface of the pure core. No DOM, no side effects. */
export { toSeconds, formatSeconds } from './timestamp';
export { extractEntries, cleanLabel } from './parse';
export { mergeEntries } from './dedupe';
export { buildHighlights } from './highlights';
export type { HighlightInput } from './highlights';
export { activeHighlight, nextHighlight, previousHighlight } from './navigate';
export { positionPercent, clusterByProximity } from './layout';
export type { Highlight, HighlightCluster, HighlightSource, RawEntry } from './types';
