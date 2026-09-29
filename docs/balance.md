# Balance: real stats → game values

Every number in `src/data/balance.json`, `jobs.json` and `decisions.json` is
labelled one of three ways:

- `stat: <id>`: copied from `src/data/stats.json` (source in `src/data/sources.md`)
- `derived: <ids>`: calculated from those stats with the formula below
- `estimate: <why>`: no real figure applies (game rules, game-feel tuning, effect
  sizes), or no source could be verified

`tests/stats.test.ts` recomputes every derived value below from `stats.json` and
fails if the JSON drifts.

## Repair and build prices (labor)

| Game job | Value | Stat(s) | Mapping |
|---|---|---|---|
| Flat tire | $25 | `rei_flat_fix` | REI flat fix, non-member |
| Bent derailleur hanger | $35 | `rei_derailleur_adjust` | Hanger alignment + indexing is billed as a derailleur adjustment |
| Worn brake pads | $20 | `helens_pad_install` | Pad install labor per pair |
| Suspension service | $160 | `helens_fork_overhaul`, `stbg_fork_aircan_combo`, `stbg_fork_lower` | Fork overhaul $120 + rear air can ($120 combo − $80 lowers = $40) |
| Trail bike build | $400 | `helens_frame_up` | Frame-up pro build |
| Race team build | $600 | `helens_frame_up`, `rei_precision_true`, `rei_brake_bleed` | Frame-up build + 2 precision trues + 2 brake bleeds as race prep |
| E-MTB service | $490 | `rei_emtb_tune` | REI E-MTB tune |

The customer also pays for **parts at retail**: parts points used × `parts_point_value`
($10, an estimate). The final bill is then scaled by satisfaction (0.6×–1.2×, estimate),
price decisions, rush fees and skill.

## Parts margin

| Game value | Value | Stat | Mapping |
|---|---|---|---|
| `economy.partsMargin` | 0.48 | `pa_margin` | Restocking costs retail value × (1 − 0.48). Parts sell at retail inside the job price. |
| `economy.partsPointRetail` | $10 | `parts_point_value` (estimate) | Abstract parts unit |
| Rush-ordered parts | retail | `pa_margin` | A same-day parts run pays full retail, so it earns no margin |

## Customer volume

Formula (all from `brain_nbda_2013` plus the `open_days` estimate):

```
store revenue       = store_profit_dollars / store_pretax_profit  = $46,000 / 5.5%  ≈ $836,364
service revenue/yr  = store revenue × service_share_avg           ≈ $54,364
service revenue/day = service revenue / open_days (310, estimate) ≈ $175
average ticket      = weighted repair price incl. parts           ≈ $68
```

| Game value | Value | Mapping |
|---|---|---|
| `customers.basePerDay` | 3 | round($175 / $68) |
| `customers.maxPerDay` | 5 | basePerDay × `service_share_top` / `service_share_avg` (11.4 / 6.5), rounded. A top service shop's volume is the cap. |
| `economy.staffEarningsPerJob` | $68 | Average walk-in ticket |

## How often each repair appears

No public dataset of repair-ticket mix was found, so the weights are estimates
(`repair_mix_flats` = 33%): flat 4, hanger 3, pads 3, suspension 2 (of 12),
build 1. **E-MTB service** (after the e-bike center decision) has weight
12 × `ebike_rider_share` (19.4%) = 2.3.

## Costs

| Game value | Value | Stats | Mapping |
|---|---|---|---|
| `economy.overheadPerDay` | $29 | `expense_share`, `payroll_share` + revenue chain above | (42.2% − 25.4%) of $175 daily service revenue. Payroll is left out because staff wages are charged separately. |
| `economy.wagePerStaffPerDay` | $151 | `bls_mechanic_wage` | $18.92/h × 8 h shift (shift length is an estimate) |
| `events.warrantyRedoCost` | $35 | `rei_derailleur_adjust` | Redoing a bad job is about one adjustment's labor |

## Industry Reports

`src/data/industryReports.json` shows one stat each game month and may run a
decision the stat makes attractive. For example, `ebike_dollar_share` (20%) leads to
the e-bike service center offer, which unlocks $490 E-MTB jobs.

## Everything else

Movement, minigame tuning, stat scales (0–100), skill levels (1–5), decision
effect sizes, starting cash, and the calendar are game design, labelled
`estimate: ...` with a reason. They are not real-world statistics.

## Tuning log

- **Phase 5:** replaced all `placeholder` labels. Rent ($120/day) became overhead
  ($29/day), and wages ($90) became $151 (BLS). Base customers went 2 → 3 and max
  6 → 5. Restock cost is now derived from the parts margin ($130 for 25 points,
  was $150). Repair prices now follow REI / Helen's / Steve the Bike Guy.
- **Phase 7 (endings):** random runs ended far too rich (median $14.7K; no
  bankruptcies). The game's owner worked for free, whereas NBDA stores spend
  25.4% of sales on payroll. Changes:
  - Added `economy.ownerPayPerDay` = $151 (derived from `bls_mechanic_wage`, 8 h).
  - Added `economy.moraleDecayPerDay` = 3 (estimate).
  - Added `customers.reputationBaseline` = 50: below-average reputation now
    *loses* walk-ins.
  - Estimates retuned: `reputationPerExtraCustomer` 30→25,
    `satisfactionPerReputationPoint` 12→18, `reputationPivot` 60→70,
    `qualityWeight`/`timeWeight` 0.6/0.4→0.75/0.25, `payAtZeroSatisfaction`
    0.6→0.4, `payAtFullSatisfaction` 1.2→1.1, `bigCustomerChance` 0.35→0.2,
    `warrantyReputationSaved` 2→1.
  - `calendar.bankruptcyCash` −1000→0.
  - The big-box buyout offer now requires reputation ≤ 75 (decisions.json).
  - Result over 300 random runs: steady 22%, sold 22%, barely 21%,
    bankrupt 14%, thriving 13%, burned out 8%, secret <1%.
- **Phase 8 (1,000-run simulation):** passed without further tuning. Max share
  28.3% (sold), and every non-secret ending occurs.
