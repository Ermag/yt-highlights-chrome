# CLAUDE.md

## Testing in a browser

- Always mute the YouTube player before doing anything else on a watch page, and
  re-check after every navigation (YouTube can restore the volume on a new video).
  Mute via the page, e.g. `document.querySelector('#movie_player').mute()` or
  `document.querySelector('#movie_player video').muted = true`.
- Expect an ad before (and sometimes during) every video, including after each
  navigation. While `#movie_player` has `ad-showing` / `ad-interrupting`, the
  player reports the ad's duration and our overlay is hidden, so don't measure
  anything yet: click the skip button (`.ytp-skip-ad-button`,
  `.ytp-ad-skip-button-modern`) once it appears, or wait the ad out, then check
  that `ad-showing` is gone before testing.
