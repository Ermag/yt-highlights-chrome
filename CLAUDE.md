# CLAUDE.md

## Testing in a browser

- Always mute the YouTube player before doing anything else on a watch page, and
  re-check after every navigation (YouTube can restore the volume on a new video).
  Mute via the page, e.g. `document.querySelector('#movie_player').mute()` or
  `document.querySelector('#movie_player video').muted = true`.
