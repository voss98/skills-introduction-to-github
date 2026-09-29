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

## Phase 3 – Build and repair
- **Station ↔ component mapping:** Frame Jig = frame + cockpit; Wheel Truing Stand =
  wheels + tires; Drivetrain Bench = drivetrain + brakes; Suspension Bench = fork +
  shock. A full build visits all four stations (8 tasks, one per component).
- **Minigame per task:** timing bar (truing, tires, hanger alignment), button
  sequence (fork install/service, drivetrain, pads, gear indexing), torque meter
  (BB, stem, shock mount, rotors, air can). Over-torque scores worse than
  under-torque, and holding to the top of the scale strips the bolt.
- **Torque targets and prices are game values, not specs.** The "Nm" numbers and
  prices in `jobs.json` are labelled placeholder and must not be read as real
  manufacturer torque specs or shop rates.
- **One active job at a time.** The counter won't hand out a new ticket until the
  current bike is returned. Tasks within a job can be done in any order.
- **Time score** uses a shop clock that only runs during open hours (9:00–17:00):
  it ticks while you walk around and jumps forward by each task's minutes. Taking
  longer than the estimate × slack lowers the time score.
- **Payment** = price × price modifier × (0.6–1.2 by satisfaction) × skill bonus.
  Reputation change = (satisfaction − 60) / 12, rounded. Satisfaction is 60%
  quality + 40% time.
- **Skill level (default 1, max 5)** widens timing zones and torque tolerance,
  slows the timing marker, shortens sequences, gives more time per step, and adds
  10% pay per level above 1. It is only changed by decisions for now; the locked
  Training Center is where it will grow later.
- **Inventory health** is one 0–100 "parts stock" number. Tasks use a few points;
  if the wall is empty the part is rush-ordered (costs cash and time). Restock at
  the Parts Wall.
- **Customers** arrive through the day (more with higher reputation). Anyone still
  waiting at closing time leaves and costs reputation. Declining costs 1 point.
- **Dev URL params:** `?seed=N` fixes the random seed, `?job=trail_build` (or any
  job id) puts that customer first in line on day 1, and `?scene=shop` skips the title.

## Phase 4 – Decision tree
- **Effects live on choices** (and optionally on nodes, applied on entry). Besides
  `sets_flags` I added `clears_flags`, so a later choice can undo an earlier
  policy (e.g. rolling back premium pricing).
- **`requires`** supports `flags` (all), `any_flags`, `not_flags`, and `min`/`max`
  stat thresholds. Choices that fail are shown greyed out with a padlock rather
  than hidden, so the player can see what an earlier choice locked or could unlock.
- **Events** tie decisions to triggers (`end_of_day`, `big_customer`,
  `supplier_offer`). Each trigger runs the highest-priority eligible event. Each
  trigger also has a repeatable fallback (quiet evening, overstock deal, rush
  request), so every end of day has a decision.
- **"No dead ends"** means: every `next` exists, the node graph has no cycles, and
  every choice list has at least one choice without requirements.
  **"Reachable"** is checked two ways: a flag fixpoint analysis, and 300 seeded
  random playthroughs that must visit every node and event.
- **Skill level** is per station (4 values). The overall `skillLevel` is their
  average, exposed on `GameState`. Decisions can raise one station or `all`.
- **Rush vs quality** is the big-customer decision. A rush pays 50% more with a
  60% deadline. Staff overtime (needs a hire) keeps the normal deadline but costs
  morale. The choice is passed to gameplay through short-lived flags that the shop
  reads and clears.
- **Hiring** adds staff who earn a little from walk-in work each day (scaled by
  morale) and cost wages. They don't appear on the shop floor yet.
- **Decision effects are placeholders.** Every effect carries
  `"source": "placeholder"`. `minDay` and `priority` are scheduling fields, not
  balance numbers.
