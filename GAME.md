# Trail Shop Tycoon

A Game Boy-style 2D platformer/RPG about running a mountain bike shop. First
playable milestone: controls, shop floor, build/repair gameplay, and the
decision tree engine.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # typecheck + production build into dist/
```

## Controls

| Game Boy | Keyboard | In the shop |
|----------|----------|-------------|
| D-pad    | Arrow keys | Walk; Up/Down on a ladder to climb |
| A        | X | Interact / confirm / advance text |
| B        | Z | Jump / back |
| Start    | Enter | Menu (job, stats, end day) |
| Select   | Shift | Input test (from the title screen) |

On phones and tablets, on-screen buttons appear under the screen. Add `?touch=1`
to the URL to show them on desktop.

## How to play

1. Talk to customers at the **Front Counter** (far left) and accept a ticket.
2. The HUD's bottom bar shows the job. A blinking **!** marks each station that has
   work waiting. Walk there and press A to start its minigame:
   - **Timing bar:** press A while the marker is inside the dark zone.
   - **Button sequence:** press each button as it lights up, before the timer runs out.
   - **Torque meter:** hold A to build torque and let go inside the dark band.
     Holding to the end strips the bolt.
3. When every task is done, go back to the counter to hand over the bike and get paid.
4. Keep the **Parts Wall** stocked. The **Suspension Bench** is up the ladder on the
   mezzanine. The **Training Center** door is locked for now.
5. At 17:00 (or Start > End Day) you get the day's summary and a decision.
   Suppliers visit every other day, and big customers ask whether to rush their order.

## Code layout

```
src/
  data/          All game data (JSON): balance numbers, decision tree, dialogue,
                 jobs/tasks, customers, shop map. Every balance number is labelled
                 "placeholder".
  core/          Pure TypeScript game logic, no Phaser (unit tested)
    gameState.ts   Single source of truth: cash, reputation, staff morale, skill
                   levels, inventory health, community goodwill, flags, modifiers
    decisions.ts   Decision tree engine (events -> nodes -> choices/effects/flags)
    shop.ts        Day loop: clock, customers, jobs, payouts, end-of-day costs
    jobs.ts        Job templates, bike tasks, quality/time scoring
    minigames.ts   Timing bar, button sequence, torque meter; difficulty from skill
    bike.ts        Bike = 8 components (frame, fork, shock, wheels, tires,
                   drivetrain, brakes, cockpit)
    layout.ts      Shop map parsing + reachability check
    balance.ts     Loads balance.json, unwraps { value, source } numbers
  input/         Key map, InputManager (abstract Game Boy inputs), DOM bindings
  gfx/           Palette, pixel font, procedural pixel art, UI helpers
  scenes/        Phaser scenes (thin views over core/)
tests/           Vitest unit tests
```

### Adding a decision

Add nodes to `src/data/decisions.json` and an event that points at the entry
node:

```json
{ "id": "ev_my_event", "trigger": "end_of_day", "entry": "my_node",
  "minDay": 3, "priority": 50, "once": true, "requires": { "flags": ["hired_staff"] } }
```

Node fields: `id`, `speaker`, `text`, `choices`, `effects`, `requires`,
`sets_flags`, `next`. Choice fields: `text` (≤ 22 chars), `requires`, `effects`,
`sets_flags`, `clears_flags`, `next` (a node id or `"END"`). An effect is
`{ "var": "cash", "delta": -100, "source": "placeholder" }`. Variables: `cash`,
`reputation`, `staffMorale`, `inventoryHealth`, `communityGoodwill`, `skill`
(plus `station`), `priceMultiplier`, `partsCostMultiplier`, `partsQualityBonus`,
`extraCustomersPerDay`, `staffCount`. `requires` supports `flags`, `any_flags`,
`not_flags`, `min` and `max`.

The tests check that every node is reachable, that no path dead-ends (no cycles,
and every choice list has an option that can't be locked), and that every number
is labelled.

## Dev URL parameters

- `?scene=shop` skips the title. `?scene=input-test` opens the input test.
- `?seed=123` fixes the random seed (customers, minigame layouts).
- `?job=trail_build` puts that job first in line on day 1. Also works with
  `flat_tire`, `bent_hanger`, `worn_pads`, `suspension_service` and `team_build`.
- `?touch=1` shows the on-screen buttons.

## Not real data

Prices, torque targets (Nm), durations, costs, and every decision effect are
invented gameplay numbers, labelled `"placeholder"` in the JSON. They are not
real shop rates or manufacturer torque specs.
