import { describe, expect, it } from 'vitest';
import balanceRaw from '../src/data/balance.json';
import decisionsRaw from '../src/data/decisions.json';
import jobsRaw from '../src/data/jobs.json';
import { BALANCE } from '../src/core/balance';
import { basePrice, JOB_TEMPLATES, jobTemplate } from '../src/core/jobs';
import { parseSourceLabel, sourceIdsFromMarkdown, stat, STATS } from '../src/core/stats';
import sourcesMd from '../src/data/sources.md?raw';

const sourceIds = new Set(sourceIdsFromMarkdown(sourcesMd));
const statIds = new Set(STATS.map((s) => s.id));

/** Every { value, source } label anywhere in a JSON tree. */
function labels(x: unknown, out: string[] = []): string[] {
  if (Array.isArray(x)) x.forEach((v) => labels(v, out));
  else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.source === 'string') out.push(o.source);
    Object.values(o).forEach((v) => labels(v, out));
  }
  return out;
}

describe('stats.json', () => {
  it('every stat has a source_id, and it has an entry in sources.md', () => {
    for (const s of STATS) {
      expect(s.source_id, s.id).toBeTruthy();
      expect(sourceIds.has(s.source_id), `${s.id} -> ${s.source_id}`).toBe(true);
    }
  });

  it('every stat has the required fields', () => {
    for (const s of STATS) {
      expect(typeof s.label).toBe('string');
      expect(typeof s.value).toBe('number');
      expect(s.unit.length).toBeGreaterThan(0);
      expect(s.year).toBeGreaterThanOrEqual(2000);
      expect(['sourced', 'estimate']).toContain(s.confidence);
      if (s.confidence === 'estimate') expect(s.note, `${s.id} must say why it is an estimate`).toBeTruthy();
    }
  });

  it('ids are unique and sources.md has no unused entries', () => {
    expect(statIds.size).toBe(STATS.length);
    const used = new Set(STATS.map((s) => s.source_id));
    expect([...sourceIds].filter((id) => !used.has(id))).toEqual([]);
  });
});

describe('no placeholders left, every balance label is sourced or explained', () => {
  for (const [name, data] of Object.entries({ balance: balanceRaw, jobs: jobsRaw, decisions: decisionsRaw })) {
    it(`${name}.json`, () => {
      const all = labels(data);
      expect(all.length).toBeGreaterThan(0);
      for (const l of all) {
        const parsed = parseSourceLabel(l);
        expect(parsed, `bad label "${l}"`).not.toBeNull();
        for (const id of parsed!.ids) expect(statIds.has(id), `unknown stat ${id} in "${l}"`).toBe(true);
      }
      expect(JSON.stringify(data)).not.toMatch(/placeholder/);
    });
  }
});

describe('derived balance values match their stats (docs/balance.md)', () => {
  const v = (id: string) => stat(id).value;
  const storeRevenue = v('store_profit_dollars') / (v('store_pretax_profit') / 100);
  const serviceDay = (storeRevenue * v('service_share_avg')) / 100 / v('open_days');

  it('repair prices come straight from the price lists', () => {
    expect(jobTemplate('flat_tire').price).toBe(v('rei_flat_fix'));
    expect(jobTemplate('bent_hanger').price).toBe(v('rei_derailleur_adjust'));
    expect(jobTemplate('worn_pads').price).toBe(v('helens_pad_install'));
    expect(jobTemplate('suspension_service').price).toBe(v('helens_fork_overhaul') + v('stbg_fork_aircan_combo') - v('stbg_fork_lower'));
    expect(jobTemplate('trail_build').price).toBe(v('helens_frame_up'));
    expect(jobTemplate('emtb_service').price).toBe(v('rei_emtb_tune'));
  });

  it('average walk-in ticket matches staff earnings per job', () => {
    const walkIns = JOB_TEMPLATES.filter((t) => !t.big && !t.requiresFlag && t.kind === 'repair');
    const w = walkIns.reduce((s, t) => s + t.weight, 0);
    const avg = walkIns.reduce((s, t) => s + basePrice(t) * t.weight, 0) / w;
    expect(Math.round(avg)).toBe(BALANCE.economy.staffEarningsPerJob);
    // Flats share of repair mix matches the estimate stat.
    expect(Math.round((jobTemplate('flat_tire').weight / w) * 100)).toBe(v('repair_mix_flats'));
  });

  it('customer volume comes from store revenue x service share / open days / average ticket', () => {
    const base = Math.round(serviceDay / BALANCE.economy.staffEarningsPerJob);
    expect(BALANCE.customers.basePerDay).toBe(base);
    expect(BALANCE.customers.maxPerDay).toBe(Math.round((base * v('service_share_top')) / v('service_share_avg')));
  });

  it('overhead, wages and parts margin come from NBDA and BLS figures', () => {
    expect(BALANCE.economy.overheadPerDay).toBe(Math.round(((v('expense_share') - v('payroll_share')) / 100) * serviceDay));
    expect(BALANCE.economy.wagePerStaffPerDay).toBe(Math.round(v('bls_mechanic_wage') * 8));
    expect(BALANCE.economy.ownerPayPerDay).toBe(Math.round(v('bls_mechanic_wage') * 8));
    expect(BALANCE.economy.partsMargin).toBe(v('pa_margin') / 100);
  });

  it('e-MTB job frequency follows the e-bike rider share', () => {
    expect(jobTemplate('emtb_service').weight).toBe(Math.round((12 * v('ebike_rider_share')) / 10) / 10);
  });
});

describe('industry reports', () => {
  it('one report per month, each showing a real stat, events exist', async () => {
    const { REPORTS, reportText } = await import('../src/core/reports');
    const { DECISIONS } = await import('../src/core/decisions');
    expect(REPORTS.length).toBe(12);
    for (const r of REPORTS) {
      expect(statIds.has(r.stat_id), r.id).toBe(true);
      expect(reportText(r).body).not.toContain('{value}');
      if (r.event) expect(DECISIONS.events.some((e) => e.id === r.event && e.trigger === 'industry_report'), r.event).toBe(true);
    }
  });

  it('the e-bike report makes e-bike service jobs appear', async () => {
    const { GameState } = await import('../src/core/gameState');
    const { ShopController } = await import('../src/core/shop');
    const count = (flag: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const s = new GameState();
        if (flag) s.setFlag('ebike_center');
        const shop = new ShopController(s, seed);
        shop.startDay();
        n += shop.customers.filter((c) => c.template.id === 'emtb_service').length;
      }
      return n;
    };
    expect(count(false)).toBe(0);
    expect(count(true)).toBeGreaterThan(0);
  });
});

describe('ledger formatting', () => {
  it('every stat fits one ledger row', async () => {
    const { compactStat } = await import('../src/core/stats');
    for (const s of STATS) {
      expect(s.short.length, s.id).toBeLessThanOrEqual(17);
      expect(compactStat(s).length, s.id).toBeLessThanOrEqual(7);
    }
  });
});
