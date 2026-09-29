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

## Phase 5 – Real-world stats
- **Labels replace "placeholder".** Every balance number is now `stat: <id>`,
  `derived: <ids>` (formula in `docs/balance.md`, checked by a test), or
  `estimate: <reason>`. Game-feel values (jump height, minigame speed) and game
  rules (0–100 scales, calendar) are labelled estimates with that reason, because
  they are not statistics.
- **Service-department scale.** The game shop is a service business, so volume and
  overhead come from the service share of an average NBDA store (6.5% of about
  $836K revenue), not the whole store's sales.
- **The NBDA ratios are from 2013.** They are the newest cost-of-doing-business
  figures I could read for free; the 2025/26 studies are paywalled.
- **Repair prices come from specific shops** (REI Tulsa, Helen's Cycles, Steve the
  Bike Guy). Prices vary by region; these are real published examples, not national
  averages.
- **Repair-type frequency is an estimate.** No public repair-mix data was found. The
  e-MTB job weight does come from a real stat (e-bike rider share).
- **A few figures were read from search-result excerpts** rather than the full page
  (noted in `sources.md`).
- **Industry Report** appears on the first day of each game month. It shows a stat,
  its publisher and year, then a decision that stat makes attractive (if eligible).
- **Calendar:** one game month = 2 shop days (a labelled estimate), so a 12-month
  run is 24 days.

## Phase 6 – Training Center
- **The door opens a separate scene** with the same platformer controls, map format
  and `PlatformWorld` builder as the shop. The shop clock stops while you are inside.
- **Training costs cash and 1 day per course.** Course fees are labelled estimates
  scaled to the game economy (real course prices would bankrupt a game shop).
  Skill courses cost $100 more per level.
- **Days away:** the shop is closed (or staff run it if hired). Overhead and wages
  are still paid, waiting customers leave without a reputation penalty, and the
  missed end-of-day and morning events play when you return.
- **Only two stations have courses** (Wheels, Suspension), as the brief lists.
  Frame and Drivetrain skill still come from decisions.
- **Exam:** 10 questions drawn at random from a 24-question bank, answers
  shuffled. 7/10 passes and sets `certified_mechanic`; a fail sets `exam_failed`
  and can be retaken for the fee. Questions are written from general bike-mechanic
  knowledge (no statistics) and are worth a review by a working mechanic.
- **Skill effects:** besides easier minigames and +10% pay per level (Phase 3),
  each level above 1 adds +3 quality to every task at that station and cuts its time
  by 8%. Both are labelled estimates in balance.json.
- **Customer Service Workshop** multiplies reputation gains by 1.25 and sets
  `cs_trained`. That unlocks new choices ("Explain our value", "Fix + loyalty card").
  Wheel skill 2 unlocks "Host a wheel clinic", average skill 2 unlocks "Expert
  rush", and certification unlocks "Mentor them".
- **Choice lists can have up to 5 entries** (was 4) to fit the new options.

## Phase 7 – Endings
- **Run length:** 12 months × 2 days = 24 shop days. The run is checked at closing,
  after the end-of-day decision. It ends on bankruptcy (cash below $0), on selling
  to the chain, or after the last day. `?runDays=N` shortens a run for testing.
- **Seven endings** (the six required plus **Burned Out**, for morale below 25).
  Priorities are unique and the last has no conditions, so exactly one is always
  chosen. The secret ending, **Guardian of the Trails**, needs this chain: help the
  trail crew (sponsor or volunteer) → run the Trail Day repair clinic → host a group
  ride → pass the certification → goodwill 60+.
- **Selling** comes from a new end-of-day decision (month 9+, reputation ≤ 75). It
  ends the run immediately.
- **You pay yourself.** Each day the owner takes a mechanic's wage (BLS mean ×
  8 h). Without it, every run ended rich, because real shops spend about a quarter of
  sales on payroll.
- **"Choices that mattered"** lists the ending's `drivers` that apply to you (flags
  you set, stats past a line), up to four.
- **Ending gallery** is saved in this browser's localStorage. If storage is blocked
  it still works for the session.
- **`npm run simulate`** runs the scripted-choice simulations that reach every ending.

## Phase 8 – Automated tests
- **Schemas use zod** (MIT, free). Every JSON file in `src/data` has a strict
  schema, and a test fails if a new JSON file is added without one.
- **The simulation test plays 1,000 seeded random runs.** The random player's
  minigame skill (25–100%), training rate, pickiness and choices are drawn per
  seed. Last run: steady 22.8%, sold 28.3%, barely 15.5%, bankrupt 13.9%,
  thriving 13.2%, burned out 5.6%, secret 0.7%.
- **The end-to-end smoke test** starts the Vite dev server in-process and drives
  headless Chromium (playwright-core, Apache-2.0) with real key events. It skips
  with a warning if no Chromium is installed; CI installs one.
- **CI:** `.github/workflows/test.yml` runs typecheck and `npm test` on every push
  and PR (free GitHub-hosted runner). It runs alongside the repo's original GitHub
  Skills workflows, which only react to their own branch names.
