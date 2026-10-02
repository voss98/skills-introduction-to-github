# Trail Shop Tycoon

A Game Boy-style 2D platformer/RPG about running a mountain bike shop for one year.
Build and repair bikes in station minigames, make business decisions, train at the
Training Center, and see which of seven endings your choices lead to. The balance
is driven by real, cited bike-industry data.

Built with Vite + TypeScript + Phaser 3 + Vitest. The native resolution is 160×144 in
the 4-shade DMG green palette. All art, sound and music are generated in code.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # all tests (unit, data, simulation, headless smoke test)
npm run simulate   # scripted + random full-run simulations only
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

The smoke test needs Chromium. It uses `CHROMIUM_PATH`, Playwright's browser folder,
or `npx playwright-core install chromium`. Without one it skips with a warning.

## Controls

| Game Boy | Keyboard | What it does |
|---|---|---|
| D-pad | Arrow keys | Walk; Up/Down on a ladder to climb; move menu cursors |
| A | X | Talk / interact / confirm / advance text; hold for the torque meter |
| B | Z | Jump; back / cancel |
| Start | Enter | Menu: job, stats, training, Shop Ledger, end day, settings, save & quit |
| Select | Shift | Mute / unmute |

On phones, on-screen buttons appear under the screen. Add `?touch=1` to show them
on desktop.

## How a run works

- **12 months, 2 shop days each.** A monthly **Industry Report** shows a real
  statistic (with source) and may offer a decision that stat makes attractive.
- **Jobs:** customers arrive at the Front Counter with repairs (flat tire, bent
  hanger, worn pads, suspension service, e-MTB service) or builds. Each task is a
  minigame at the Frame Jig, Wheel Truing Stand, Drivetrain Bench or Suspension
  Bench. Quality and speed set payment and reputation.
- **Decisions** come at the end of each day, when big customers arrive, and when
  suppliers visit. Earlier choices set flags that lock or unlock later options.
- **Training Center** (the door on the mezzanine): Wheel Building Academy,
  Suspension Lab, Customer Service Workshop, and a 10-question Mechanic
  Certification Exam. Training costs cash and a day away. Skills make minigames
  easier, raise quality, shorten jobs and unlock new decisions.
- **Endings:** Thriving Flagship Shop, Steady Local Favorite, Barely Surviving,
  Bankruptcy, Sold to a Big-Box Chain, Burned Out, and one secret. The Ending
  Gallery remembers the ones you've found.
- **Saving:** autosaves at the start of each new day. Start > Save & Quit, then
  Continue from the title. Saves live in your browser's localStorage.

## Project structure

```
src/
  data/                 All game data (JSON) + sources.md. No logic.
    stats.json            Real-world figures (id, value, unit, year, source_id, confidence)
    sources.md            One entry per source_id (publisher, title, year, URL)
    balance.json          Every tuning number, labelled stat / derived / estimate
    jobs.json             Tasks (minigames) and customer jobs; prices from real price lists
    decisions.json        Decision tree: events + nodes
    industryReports.json  One real stat per month, optionally tied to a decision
    training.json         Training programs
    examQuestions.json    Certification exam question bank
    palettes.json         Selectable 4-shade color palettes (Settings > Colors)
    endings.json          Endings with conditions, priority and "choices that mattered" drivers
    dialogue.json, customers.json, shopLayout.json, trainingLayout.json
  core/                 Pure TypeScript game logic (no Phaser), all unit tested
    gameState.ts          The single source of truth (cash, reputation, morale, skills, ...)
    decisions.ts          Decision engine; endings.ts, training.ts, shop.ts, jobs.ts,
    minigames.ts, calendar.ts, reports.ts, stats.ts, save.ts, simulate.ts, ...
  audio/                WebAudio chiptune SFX + soundtrack, settings
  input/                Key map, InputManager (abstract Game Boy buttons), DOM bindings
  gfx/                  Palette, pixel font, procedural pixel art
  scenes/               Phaser scenes (thin views over core/)
tests/                  Vitest: unit, schema (zod), simulation, e2e smoke (playwright-core)
docs/balance.md         How each real stat maps to a game value, plus the tuning log
ASSUMPTIONS.md          Every judgement call, by phase
.github/workflows/test.yml  CI: typecheck + npm test
```

## How to add things

### A decision node
1. Add nodes under `nodes` in `src/data/decisions.json`. Each has `id`, `text`,
   optional `speaker`, and either `choices` (up to 5) or `next`.
2. A choice has `text` (≤ 22 chars), `effects`, optional `requires`,
   `sets_flags`, `clears_flags`, and `next` (a node id or `"END"`).
   - An effect looks like `{ "var": "cash", "delta": -100, "source": "estimate: why" }`.
   - `requires` supports `flags`, `any_flags`, `not_flags`, and `min`/`max` on
     `cash`, `reputation`, `staffMorale`, `inventoryHealth`, `communityGoodwill`,
     `skill` (average) or `skill:<station>`.
3. Add an event pointing at the entry node:
   `{ "id": "ev_x", "trigger": "end_of_day", "entry": "x", "minDay": 3, "priority": 50, "once": true }`.
   Triggers: `end_of_day`, `big_customer`, `supplier_offer`, `industry_report`.
4. Run `npm test`. It checks reachability, dead ends, labels and the schema.

### A stat
1. Add an entry to `src/data/stats.json` (`id`, `label`, `short` ≤ 17 chars,
   `value`, `unit`, `year`, `source_id`, `confidence`; estimates also need a
   `note` saying why).
2. Add a `## <source_id>` entry to `src/data/sources.md` with publisher, title,
   year and URL.
3. To use it in balance, reference it as `"source": "stat: <id>"` or
   `"derived: <id>,<id>"`, and document the formula in `docs/balance.md`
   (add a check to `tests/stats.test.ts`).

### A training station
1. Add a program to `src/data/training.json` (`kind`: `skill`, `exam` or
   `workshop`; `station` = layout id).
2. Add a station with the same id to `src/data/trainingLayout.json`, and a sprite
   in `trainingArt()` in `src/gfx/sprites.ts`.
3. `tests/training.test.ts` checks the four required programs and that every
   station can be reached.

### A color palette
Add an entry to `src/data/palettes.json`: `id`, `name` (≤ 10 chars) and exactly 4
`colors` as `#rrggbb`, darkest first. It appears in Settings > Colors right away.
`tests/palettes.test.ts` checks the shades get lighter in order and that the
darkest and lightest colors have at least 4.5:1 contrast so text stays readable.

### An ending
1. Add it to `src/data/endings.json` with a unique `priority`, `conditions`
   (same format as `requires`), `text`, `vignette`, and `drivers` (flags or stats
   that explain "choices that mattered").
2. Add a 64×40 vignette in `vignetteArt()` (`v_<name>`).
3. Add a scripted strategy that reaches it in `tests/endings.test.ts`. The 1,000-run
   simulation checks no ending takes more than 60% of runs.

## Dev URL parameters

`?scene=shop` (skip the title), `?seed=123` (fixed randomness),
`?job=trail_build` (that customer first on day 1), `?runDays=1` (very short run),
`?touch=1` (on-screen buttons).

## Open questions and assumptions

All assumptions are listed in [ASSUMPTIONS.md](ASSUMPTIONS.md). Open questions:

- **NBDA ratios are from 2013.** They are the newest free cost-of-doing-business
  figures. Newer paywalled NBDA studies could replace them.
- **Repair-type frequency and shop open days are estimates.** No public data was
  found. A shop's ticket history would make this real.
- **Prices are from specific shops (REI Tulsa, Helen's Cycles, Steve the Bike Guy).**
  Should prices vary by region?
- **Compressed calendar:** one month = 2 shop days, to keep a run to about an
  hour. Is that the right pacing?
- **Owner pay:** the owner draws a BLS mechanic wage each day. Without it every run
  ended rich. Should the owner's pay be a player choice?
- **The exam questions** are general mechanic knowledge and should get a review by
  a working mechanic.
- **The original GitHub Skills course README** moved to
  `docs/github-skills-course-README.md`.

## Hosting (not done: needs your approval)

Nothing has been deployed. `npm run build` writes a static site to `dist/`
(relative paths, so it works from any folder). Free options:

1. **GitHub Pages:** Settings → Pages → Source: GitHub Actions. Add a workflow
   that runs `npm ci && npm run build` and uploads `dist/` with
   `actions/upload-pages-artifact` + `actions/deploy-pages`. The URL is
   `https://<user>.github.io/<repo>/`.
2. **Netlify** (free tier): "Add new site" → import the repo → build command
   `npm run build`, publish directory `dist`. Or drag and drop the `dist` folder.
3. **Cloudflare Pages** (free tier): connect the repo → framework "Vite" → build
   `npm run build`, output `dist`.

Each of these makes the game public, so pick one when you're ready.
