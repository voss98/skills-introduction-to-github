import { describe, expect, it } from 'vitest';
import endingsRaw from '../src/data/endings.json';
import type { NodeView } from '../src/core/decisions';
import { chooseEnding, choicesThatMattered, ENDINGS, runEndReason } from '../src/core/endings';
import { GameState } from '../src/core/gameState';
import { firstUnlocked, simulateRun, type Strategy } from '../src/core/simulate';

/** A scripted player: preferred choice text per decision node, fixed minigame skill, optional training plan. */
function scripted(prefs: Record<string, string[]>, quality: number, plan: string[] = [], examScore = 10): Strategy {
  const todo = [...plan];
  return {
    choose: (view: NodeView) => {
      for (const text of prefs[view.id] ?? []) {
        const i = view.choices.findIndex((c) => c.text === text && !c.locked);
        if (i >= 0) return i;
      }
      return firstUnlocked(view);
    },
    quality: () => quality,
    train: (s) => (todo.length && s.cash > 800 ? todo.shift()! : null),
    examScore: () => examScore,
    restockBelow: 25,
  };
}

const NO_SALE = { buyout_offer: ['NOT FOR SALE'] };

export const SCRIPTS: Record<string, Strategy> = {
  thriving_flagship: scripted(
    {
      ...NO_SALE,
      pricing_start: ['KEEP PRICES'],
      supplier_intro: ['PREMIUM BULK $400'],
      big_rush: ['NORMAL PACE'],
      hiring_start: ['HIRE PRO MECHANIC'],
      warranty_start: ['30-DAY FREE FIXES'],
      sponsor_start: ['SPONSOR $300'],
      report_service: ['ADD A STAND $300'],
      report_wages: ['GIVE A RAISE'],
      staff_training: ['PAY FOR THE COURSE'],
      quiet_evening: ['EVENING TRAIL RIDE'],
    },
    96,
    ['cs_workshop', 'wheel_academy'],
  ),
  steady_favorite: scripted({ ...NO_SALE, pricing_start: ['LOCALS DISCOUNT 10%'], sponsor_start: ['NOT RIGHT NOW'], hiring_start: ['HIRE APPRENTICE'], quiet_evening: ['EVENING TRAIL RIDE'] }, 72),
  barely_surviving: scripted({ ...NO_SALE, pricing_start: ['KEEP PRICES'], hiring_start: ['HIRE APPRENTICE'], warranty_start: ['NO WARRANTY'], quiet_evening: ['EVENING TRAIL RIDE'] }, 45),
  bankruptcy: scripted(
    {
      ...NO_SALE,
      report_market: ['HOLD PRICES'],
      supplier_intro: ['PREMIUM BULK $400'],
      hiring_start: ['HIRE PRO MECHANIC'],
      sponsor_start: ['SPONSOR $300'],
      report_service: ['NOT YET'],
      report_ebike: ['E-BIKE CENTER $600'],
      report_tourism: ['NO FLEET'],
      report_wages: ['GIVE A RAISE'],
      staff_training: ['PAY FOR THE COURSE'],
      marketing_start: ['WORD OF MOUTH'],
      trail_day: ['SKIP IT'],
      report_kids: ['SKIP IT'],
    },
    10,
  ),
  // (takeJob is patched below: this owner turns most work away.)
  sold_to_chain: scripted({ buyout_offer: ['SELL THE SHOP'], hiring_start: ['HIRE APPRENTICE'] }, 60),
  burned_out: scripted(
    {
      ...NO_SALE,
      hiring_start: ['DO IT ALL MYSELF'],
      sponsor_start: ['NOT RIGHT NOW'],
      quiet_evening: ['TIDY THE PARTS WALL'],
      report_safety: ['HOST THE CLINIC'],
      price_complaints: ['ADD FREE SAFETY CHECK'],
    },
    70,
  ),
  trail_guardian: scripted(
    {
      ...NO_SALE,
      sponsor_start: ['VOLUNTEER AT DIG DAY'],
      trail_day: ['RUN A REPAIR CLINIC'],
      marketing_start: ['HOST A GROUP RIDE'],
      hiring_start: ['HIRE APPRENTICE'],
    },
    90,
    ['cert_exam'],
  ),
};

// The bankrupt owner turns away three of every four customers.
SCRIPTS.bankruptcy.takeJob = (c) => c.id % 4 === 0;

describe('endings data', () => {
  it('has at least six endings including the required ones and one secret', () => {
    const ids = ENDINGS.map((e) => e.id);
    for (const id of ['thriving_flagship', 'steady_favorite', 'barely_surviving', 'bankruptcy', 'sold_to_chain']) expect(ids).toContain(id);
    expect(ENDINGS.length).toBeGreaterThanOrEqual(6);
    expect(ENDINGS.filter((e) => e.secret).length).toBe(1);
  });

  it('priorities are unique so exactly one ending wins, and there is a condition-free fallback', () => {
    expect(new Set(ENDINGS.map((e) => e.priority)).size).toBe(ENDINGS.length);
    const last = ENDINGS[ENDINGS.length - 1];
    expect(Object.keys(last.conditions)).toEqual([]);
  });

  it('conditions only use known variables and labelled numbers', () => {
    const vars = ['cash', 'reputation', 'staffMorale', 'skill', 'communityGoodwill', 'inventoryHealth'];
    for (const e of endingsRaw.endings) {
      for (const bound of [(e.conditions as { min?: object }).min, (e.conditions as { max?: object }).max]) {
        for (const [k, v] of Object.entries(bound ?? {})) {
          expect(vars).toContain(k);
          expect((v as { source: string }).source).toMatch(/^estimate: /);
        }
      }
    }
  });

  it('the secret ending needs the decision chain plus certification', () => {
    const s = new GameState();
    s.applyEffect({ var: 'communityGoodwill', set: 90 });
    for (const f of ['trail_volunteer', 'trail_clinic', 'group_ride']) s.setFlag(f);
    expect(chooseEnding(s).id).not.toBe('trail_guardian');
    s.setFlag('certified_mechanic');
    expect(chooseEnding(s).id).toBe('trail_guardian');
  });
});

describe('ending selection and priority', () => {
  it('bankruptcy beats everything but the secret; sold beats thriving', () => {
    const s = new GameState();
    s.applyEffect({ var: 'cash', set: -50 });
    s.setFlag('sold_to_chain');
    expect(chooseEnding(s).id).toBe('bankruptcy');
    s.applyEffect({ var: 'cash', set: 99999 });
    s.applyEffect({ var: 'reputation', set: 100 });
    expect(chooseEnding(s).id).toBe('sold_to_chain');
  });

  it('thriving needs every stat high; otherwise it falls through to the next ending', () => {
    const s = new GameState();
    s.applyEffect({ var: 'cash', set: 9000 });
    s.applyEffect({ var: 'reputation', set: 90 });
    s.applyEffect({ var: 'communityGoodwill', set: 70 });
    s.applyEffect({ var: 'staffMorale', set: 70 });
    s.applyEffect({ var: 'skill', station: 'all', set: 2 });
    expect(chooseEnding(s).id).toBe('thriving_flagship');
    s.applyEffect({ var: 'staffMorale', set: 20 });
    expect(chooseEnding(s).id).toBe('burned_out');
    s.applyEffect({ var: 'staffMorale', set: 45 });
    expect(chooseEnding(s).id).toBe('steady_favorite');
    s.applyEffect({ var: 'reputation', set: 40 });
    expect(chooseEnding(s).id).toBe('barely_surviving');
  });

  it('the run ends on bankruptcy, a sale, or after 12 months', () => {
    const s = new GameState();
    expect(runEndReason(s, 24)).toBeNull();
    s.applyEffect({ var: 'cash', set: -1 });
    expect(runEndReason(s, 24)).toBe('bankrupt');
    s.applyEffect({ var: 'cash', set: 100 });
    s.setFlag('sold_to_chain');
    expect(runEndReason(s, 24)).toBe('sold');
    s.clearFlag('sold_to_chain');
    for (let d = 1; d < 24; d++) s.nextDay();
    expect(runEndReason(s, 24)).toBe('complete');
  });

  it('"choices that mattered" lists the flags and stats that pushed toward the ending', () => {
    const s = new GameState();
    s.setFlag('trail_volunteer');
    s.setFlag('certified_mechanic');
    const lines = choicesThatMattered(ENDINGS.find((e) => e.id === 'trail_guardian')!, s);
    expect(lines).toContain('You dug trail with the volunteers.');
    expect(lines).toContain('You earned your mechanic certification.');
    expect(lines.length).toBeLessThanOrEqual(4);
  });
});

describe('simulation with scripted choices reaches every ending', () => {
  for (const [endingId, strategy] of Object.entries(SCRIPTS)) {
    it(endingId, () => {
      const r = simulateRun(7, strategy);
      expect(r.ending.id, `${endingId}: got ${r.ending.id} (${r.reason}) cash ${r.state.cash} rep ${r.state.reputation} morale ${r.state.staffMorale} goodwill ${r.state.communityGoodwill} flags ${r.state.snapshot.flags.join(',')}`).toBe(endingId);
    });
  }

  it('the scripts cover every ending in endings.json', () => {
    expect(Object.keys(SCRIPTS).sort()).toEqual(ENDINGS.map((e) => e.id).sort());
  });
});
