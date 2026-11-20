# Changelog

## 0.2.0

### New
- **First-day tutorial.** Six short tips walk you through day one: the counter,
  the station markers, the minigames, handing a bike back, and closing up. Each tip
  shows once per run. Turn it off in Settings > Tutorial. Tips live in
  `src/data/tutorial.json`.
- **Your Year chart.** The ending screen now draws your cash (solid line) and
  reputation (dotted line) for every day of the run, with a tick at the start of
  each month.
- **Text speed.** Settings > Text: slow, normal, fast or instant.
- **Reduce flashing.** Settings > Flashing: stops blinking cursors, markers and
  the bobbing "A" prompt.
- **Version number** on the title screen.

### Changed
- The game now records each day's closing cash and reputation in the save.
  Saves from 0.1.0 still load (with an empty chart history).
- The smoke test now finds newer Chromium builds (`chrome-linux64`).

### Tests
- 178 automated tests (was 167): tutorial, chart scaling, day history, new
  settings, and loading a 0.1.0 save.

## 0.1.0

First complete playable build: shop floor, build/repair minigames, decision tree,
real-world stats and Shop Ledger, Training Center, 12-month runs with seven
endings, chiptune audio, save/continue and color palettes.
