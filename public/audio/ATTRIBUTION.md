# Audio Attribution

Rogue Glassier currently ships without downloaded third-party audio files.

The game first attempts to load optional files from this directory:

- `launch.ogg` / `launch.mp3`
- `hit.ogg` / `hit.mp3`
- `break.ogg` / `break.mp3`
- `multiplier.ogg` / `multiplier.mp3`
- `upgrade.ogg` / `upgrade.mp3`
- `coreHit.ogg` / `coreHit.mp3`
- `victory.ogg` / `victory.mp3`
- `uiClick.ogg` / `uiClick.mp3`
- `denied.ogg` / `denied.mp3`

If those files are missing, `src/audio.js` uses Web Audio API synth fallbacks.

Recommended future source: Kenney audio packs, Creative Commons CC0.
https://kenney.nl/assets?q=audio
