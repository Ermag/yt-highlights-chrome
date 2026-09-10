# Changelog

## 4.1.1

### Changed

- Store-listing summary rewritten to lead with what the extension does
  ("clickable chapter markers on the YouTube progress bar"). No functional
  changes; `manifest.json` `description` is the Web Store summary field, so the
  copy change ships as a version bump.

## 4.1.0

### Added

- The current-highlight label in the player controls links to its source
  comment when the timestamp was found only in a comment — click it (or press
  Enter) to scroll that comment into view and flash it.
- Hover / focus tooltips on the previous, next and toggle control buttons.
  Previous and next name the highlight they jump to; the toggle reads "Hide
  highlights" / "Show highlights".

### Changed

- The control buttons' hover state matches YouTube's modern player: a
  translucent overlay fades in over the pill, with a frosted-glass backdrop,
  instead of the whole button darkening.

## 4.0.0

Full rewrite: TypeScript with a bundled build, a pure functional core covered by
unit tests, and a smaller runtime (~17 KB vs ~67 KB).

### Added

- Highlights are built from the description **or** the comments — v3 needed both.
- The on/off setting lives in `chrome.storage` (v3 wrote to youtube.com's
  `localStorage`, sharing YouTube's namespace).
- A show/hide toggle button in the player controls.
- Keyboard-accessible markers and controls: focus rings, `aria-label`s, real
  `<button>`s.
- Localisable UI strings (`_locales/`).
- The overlay hides itself during ads.

### Changed

- Main-world access via the `content_scripts` `world` key (Chrome 111+). No more
  web-accessible injected script or `postMessage` round trip to the page.
- A ~1 KB built-in tooltip replaces Tippy.js (−50 KB).
- Timestamps are keyed by seconds, so `5:00` / `05:00` / `5:00 ` no longer
  produce separate markers.
- Markers cluster by pixel proximity and the gap scales with the progress-bar
  width, instead of a fixed 1%.
- Duplicate labels at one timestamp are merged by normalised text (predictable),
  replacing v3's fuzzy Levenshtein merge.
- The native YouTube chapter title is left untouched (v3 overwrote it with
  "• View Chapter" on every video).

### Fixed

- Comment / description text can no longer inject markup through the tooltip
  (stored XSS in v3, via `innerHTML` into Tippy).
- Timestamps past the end of the video are dropped instead of placing markers off
  the end of the bar.
- Highlight labels are trimmed properly — no leading `" "` or stray leading
  dashes.
- Marker clicks no longer also trigger YouTube's own seek-to-cursor.
- Observers, intervals and listeners are torn down on SPA navigation.
