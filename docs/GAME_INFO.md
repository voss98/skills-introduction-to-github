# Trail Shop Tycoon: Game Info and Roadmap

**Version:** 0.1.0 (first complete playable build)
**Genre:** Game Boy-style 2D platformer / business sim / RPG
**Platform:** Web browser (desktop keyboard or phone touch controls)
**Length:** one run is 12 in-game months, about an hour of play

---

## The pitch

You run a small mountain bike shop for one year. Walk the shop floor, take
customers' bikes at the counter, and fix or build them at four work stations
through quick minigames. Between jobs you make business calls on pricing, hiring,
suppliers, warranties, marketing, trail sponsorship and rush orders. Your choices
and your craft decide how the year ends: a thriving flagship shop, bankruptcy,
or one of five other endings, including a secret one.

The balance is grounded in real, cited bike-industry figures, such as published
repair prices, shop margins and mechanic wages. You can read every one of them
in-game in the Shop Ledger.

---

## Features

### The shop floor
- A side-scrolling shop with shelves, a ladder and a mezzanine.
- Six stations: Front Counter, Parts Wall, Frame Jig, Wheel Truing Stand,
  Drivetrain Bench and Suspension Bench. A door leads to the Training Center.
- A HUD shows cash, reputation, month, day and the shop clock (open 9:00–17:00).

### Building and repairing bikes
- Bikes are modelled as 8 components: frame, fork, shock, wheels, tires,
  drivetrain, brakes and cockpit.
- There are three Game Boy-style minigames, across 15 bench tasks:
  - **Timing bar:** truing wheels, seating tires, aligning a hanger.
  - **Button sequence:** fork service, drivetrain install, brake pads.
  - **Torque meter:** hold A and release on target. Over-tightening strips the bolt.
- There are 7 job types:
  - Repairs: flat tire, bent derailleur hanger, worn brake pads, suspension
    service, e-MTB service.
  - Builds: trail bike build and race team build.
- Quality and speed decide customer satisfaction, payment and reputation.

### Decisions
- A data-driven decision tree: 25 events and 88 story nodes, 25 of them with choices.
- Decisions come up at the end of each day, when a big customer arrives, when the
  parts supplier visits, and with each monthly **Industry Report**.
- Earlier choices lock or unlock later options. For example, helping the trail crew
  unlocks group rides, and hiring staff unlocks overtime on rush jobs.

### Real-world stats
- 50 figures in the Shop Ledger: 47 from published sources and 3 labelled
  estimates, with 16 sources listed in `src/data/sources.md`.
- Sources include Circana (via PeopleForBikes), the Outdoor Industry Association,
  Trust for Public Land, NBDA (via Bicycle Retailer), the US Bureau of Labor
  Statistics, the journal *Injury*, the CDC, and published shop price lists (REI,
  Helen's Cycles, Steve the Bike Guy).
- These figures drive job prices, parts margins, customer volume, overhead and
  wages. Each mapping is documented in `docs/balance.md`.

### Training Center
- Wheel Building Academy and Suspension Lab each raise a station skill (levels 1–5).
- Customer Service Workshop makes happy customers raise reputation 25% faster and
  opens new dialogue options.
- Mechanic Certification Exam: 10 questions drawn from a 24-question bank; score
  7 or more to pass.
- Training costs cash and a day away. Higher skill makes minigames more forgiving,
  raises quality, shortens jobs and unlocks new decisions.

### Seven endings
Guardian of the Trails (secret), Bankruptcy, Sold to a Big-Box Chain, Thriving
Flagship Shop, Burned Out, Steady Local Favorite and Barely Surviving. Each ending
screen shows a pixel-art scene, your final stats and the choices that mattered.
The Ending Gallery tracks which ones you've found.

### Presentation
- 160×144 resolution with pixel-perfect scaling.
- 7 selectable 4-shade color palettes: Classic, Pocket, Dusk, Desert, Alpine, Forest
  and Contrast.
- All art, the pixel font, sound effects and the looping chiptune soundtrack are
  generated in code. There are no downloaded assets.
- Saves automatically at the start of each new day. Use Continue on the title screen.

---

## Controls

| Game Boy | Keyboard | Use |
|---|---|---|
| D-pad | Arrow keys | Walk, climb ladders, move cursors |
| A | X | Talk, interact, confirm; hold for the torque meter |
| B | Z | Jump, back |
| Start | Enter | Menu (job, stats, training, Shop Ledger, end day, settings, save) |
| Select | Shift | Mute / unmute |

On phones, on-screen buttons appear under the screen.

---

## Tech

- **Stack:** Vite, TypeScript, Phaser 3, Vitest.
- **Structure:** game data (stats, dialogue, decisions, endings, training, palettes)
  lives in JSON under `src/data`, separate from game logic.
- **Tests:** 167 automated tests covering:
  - unit tests and JSON schema checks
  - 1,000 simulated playthroughs that check no ending dominates
  - a headless-browser test that plays a job and a decision, saves, continues and
    reaches an ending.
- **CI:** GitHub Actions runs the tests on every push.

---

## Known limitations

- The NBDA shop-economics ratios are from 2013. They are the newest free figures;
  newer studies are paywalled.
- How often each repair type appears, and how many days a shop is open, are labelled
  estimates. No public data was found.
- The calendar is compressed: one game month is two shop days.
- Staff you hire earn money but don't appear on the shop floor yet.
- The certification exam questions should be reviewed by a working bike mechanic.
- Saves live in the browser's local storage. Clearing site data deletes them, and
  they don't move between devices.

---

## Roadmap (proposed)

This is a proposal, not a commitment. Each item fits the existing data-driven
design, so most of the work is new JSON content plus a little code.

### v0.2: Polish and feedback (next)
- Playtest the full 12-month run with real players and tune the economy (JSON only).
- Have a working mechanic review the exam questions.
- Add a short tutorial for the first day: counter, first minigame, end of day.
- Accessibility: remappable keys, a slower text speed option, and a reduced-flash option.
- Add a stats-over-time screen at the ending (cash and reputation by month).

### v0.3: More shop life
- Show hired staff on the shop floor, working stations on their own.
- Add seasons: busier spring and summer, quiet winter, with matching Industry Reports.
- More job types: tubeless conversions, dropper posts, wheel builds, bike fits.
- Let customers come back: regulars remember how well you treated them.
- More decision chains, such as a shop ride series, a youth team sponsorship, and a
  used-bike trade-in program.

### v0.4: Depth
- Frame Jig and Drivetrain courses at the Training Center (all four stations
  trainable).
- Inventory by part category (tires, pads, chains) instead of one parts gauge.
- More endings tied to new decision chains.
- Update the real-world stats with newer published figures as they become available.

### v1.0: Release
- A full content and balance pass, informed by playtest data.
- Optional cloud save if hosting supports it.
- Packaging for itch.io or a similar free host, and an installable offline version (PWA).

### Ideas parking lot
- Hard mode (tighter margins, fewer customers).
- A daily challenge with a fixed seed.
- Multiple save slots.
- Localization.

---

## Credits and licensing

- Game design, code, art and music were generated for this project. No third-party
  sprites, fonts or music are used.
- Libraries: Phaser 3 (MIT), Vite (MIT). Test tools: Vitest (MIT), zod (MIT),
  playwright-core (Apache-2.0).
- The repository's `LICENSE` file is the MIT license that came with the GitHub
  Skills template (copyright GitHub, Inc.). **Choose your own license for the game
  before you distribute it.**
- Real-world statistics belong to their publishers. They are quoted with sources in
  the Shop Ledger and `src/data/sources.md`.
