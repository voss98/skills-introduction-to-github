# Assumptions

Decisions made where the brief was ambiguous. Each is easy to revisit.

## Phase 1 – Scaffold and controls
- **Repo layout:** the game lives at the repository root (this repo was a GitHub
  Skills template). The original `README.md` and `.github/` workflows are untouched;
  game docs live in `GAME.md`.
- **Versions:** Phaser is pinned to the 3.x line (`^3.90.0`) because the brief says
  Phaser 3 (Phaser 4 is the npm `latest`). TypeScript is pinned to 5.9 rather than
  the new 7.x native compiler, for tooling stability.
- **Keys are matched by `KeyboardEvent.code`** (physical key position), so X/Z work
  on non-QWERTY layouts in the same place. Both Shift keys are Select; Numpad Enter
  is also Start.
- **Pixel-perfect scaling** is done with the largest whole-number zoom that fits the
  window (not fractional "fit" scaling), so every game pixel is an exact square.
- **Palette:** the classic DMG greens `#0f380f #306230 #8bac0f #9bbc0f`. Everything,
  including text, is drawn in these four shades. All graphics are generated in code,
  so there are no image assets.
- **Font:** a custom 5x7 uppercase pixel font (26 characters per line). Text is
  upper-cased for display.
- **Touch buttons** are HTML buttons under the canvas. They appear on touch
  (coarse-pointer) devices, or on any device with `?touch=1` in the URL.
- **Input test scene:** hold Start+Select to leave it.

## Phase 2 – Shop floor
- **Jump is B, interact is A.** The brief assigns A to interact; B was the free
  face button, so it jumps (B also cancels menus). While climbing, B jumps off.
- **Climbing:** stand at a ladder and hold Up (or Down at the top of the ladder).
  The mezzanine can also be reached by jumping across the two wall shelves.
- **Interact range:** you must be standing on the same floor level inside a
  station's footprint; a bouncing "A" marker and the bottom bar show what A will do.
- **Movement and physics numbers** (walk speed, jump, gravity) live in
  `src/data/balance.json` alongside other balance numbers and are placeholders.
- **HUD** shows cash, reputation and day on the top bar, and a context hint on the
  bottom bar. The full stat list is under Start > Shop Stats.
- **Shop map** is an ASCII grid in `src/data/shopLayout.json` so it can be edited
  without touching code.
