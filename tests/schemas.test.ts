import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import balance from '../src/data/balance.json';
import customers from '../src/data/customers.json';
import decisions from '../src/data/decisions.json';
import dialogue from '../src/data/dialogue.json';
import endings from '../src/data/endings.json';
import examQuestions from '../src/data/examQuestions.json';
import industryReports from '../src/data/industryReports.json';
import jobs from '../src/data/jobs.json';
import shopLayout from '../src/data/shopLayout.json';
import stats from '../src/data/stats.json';
import training from '../src/data/training.json';
import trainingLayout from '../src/data/trainingLayout.json';
import { STATS } from '../src/core/stats';
import { REPORTS } from '../src/core/reports';
import { MODIFIER_KEYS, STAT_KEYS, WORK_STATIONS } from '../src/core/gameState';
import { COMPONENT_SLOTS } from '../src/core/bike';

/** Every JSON data file is validated against a schema here. */

const LABEL = /^(stat|derived|estimate): .+/;
const sourced = z.object({ value: z.number(), source: z.string().regex(LABEL) }).strict();
const readme = z.string().min(1);
const id = z.string().regex(/^[a-z0-9_]+$/);
const station = z.enum(WORK_STATIONS);
const effectVar = z.enum(['cash', 'skill', ...STAT_KEYS, ...MODIFIER_KEYS] as [string, ...string[]]);

const effect = z
  .object({
    var: effectVar,
    delta: z.number().optional(),
    set: z.number().optional(),
    station: z.union([station, z.literal('all')]).optional(),
    source: z.string().regex(LABEL),
  })
  .strict();

const bound = z.record(z.string().regex(/^(cash|reputation|staffMorale|inventoryHealth|communityGoodwill|skill|skill:[a-z_]+)$/), sourced);
const requirement = z
  .object({
    flags: z.array(id).optional(),
    any_flags: z.array(id).optional(),
    not_flags: z.array(id).optional(),
    min: bound.optional(),
    max: bound.optional(),
  })
  .strict();

/** Nested objects whose leaves are all { value, source }. */
const sourcedTree: z.ZodType = z.lazy(() => z.union([sourced, z.record(z.string(), sourcedTree)]));

const layout = z
  .object({
    _readme: readme,
    tileSize: z.literal(8),
    rows: z.array(z.string().regex(/^[#=HL.]+$/)).min(4),
    playerStart: z.object({ tx: z.number().int(), ty: z.number().int() }).strict(),
    stations: z.array(z.object({ id, name: z.string(), short: z.string().max(22), tx: z.number().int(), ty: z.number().int(), w: z.number().int().positive() }).strict()),
    decor: z.array(z.object({ sprite: id, tx: z.number().int(), ty: z.number().int(), w: z.number().int() }).strict()),
  })
  .strict();

const SCHEMAS: Record<string, [z.ZodType, unknown]> = {
  'balance.json': [z.object({ _readme: readme }).catchall(sourcedTree), balance],
  'stats.json': [
    z
      .object({
        _readme: readme,
        stats: z.array(
          z
            .object({
              id,
              label: z.string().min(3),
              short: z.string().max(17),
              value: z.number(),
              unit: z.string().min(1),
              year: z.number().int().min(2000).max(2030),
              source_id: id,
              confidence: z.enum(['sourced', 'estimate']),
              note: z.string().optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    stats,
  ],
  'jobs.json': [
    z
      .object({
        _readme: readme,
        tasks: z.record(
          id,
          z
            .object({
              name: z.string().max(18),
              station,
              slot: z.enum(COMPONENT_SLOTS),
              minigame: z.enum(['timing', 'sequence', 'torque']),
              hint: z.string(),
              minutes: sourced,
              partsUse: sourced,
              difficulty: sourced,
              targetNm: sourced.optional(),
            })
            .strict(),
        ),
        jobs: z.array(
          z
            .object({
              id,
              kind: z.enum(['repair', 'build']),
              name: z.string(),
              big: z.boolean().optional(),
              requiresFlag: id.optional(),
              tasks: z.array(id).min(1),
              price: sourced,
              weight: sourced,
              issues: z.array(z.object({ slot: z.enum(COMPONENT_SLOTS), condition: sourced }).strict()).optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    jobs,
  ],
  'decisions.json': [
    z
      .object({
        _readme: readme,
        events: z.array(
          z
            .object({
              id,
              trigger: z.enum(['end_of_day', 'big_customer', 'supplier_offer', 'industry_report']),
              entry: id,
              minDay: z.number().int().min(1),
              priority: z.number().int(),
              once: z.boolean(),
              requires: requirement.optional(),
            })
            .strict(),
        ),
        nodes: z.record(
          id,
          z
            .object({
              id,
              speaker: z.string().max(22).optional(),
              text: z.string().min(1),
              requires: requirement.optional(),
              effects: z.array(effect).optional(),
              sets_flags: z.array(id).optional(),
              choices: z
                .array(
                  z
                    .object({
                      text: z.string().max(22),
                      requires: requirement.optional(),
                      effects: z.array(effect),
                      sets_flags: z.array(id).optional(),
                      clears_flags: z.array(id).optional(),
                      next: z.string(),
                    })
                    .strict(),
                )
                .optional(),
              next: z.string().optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    decisions,
  ],
  'endings.json': [
    z
      .object({
        _readme: readme,
        endings: z.array(
          z
            .object({
              id,
              title: z.string().max(24),
              secret: z.boolean().optional(),
              priority: z.number().int(),
              vignette: id,
              conditions: requirement,
              text: z.string().min(10),
              drivers: z.array(
                z
                  .object({
                    flag: id.optional(),
                    stat: z.enum(['cash', 'reputation', 'staffMorale', 'communityGoodwill']).optional(),
                    above: z.number().optional(),
                    below: z.number().optional(),
                    text: z.string(),
                  })
                  .strict(),
              ),
            })
            .strict(),
        ),
      })
      .strict(),
    endings,
  ],
  'training.json': [
    z
      .object({
        _readme: readme,
        programs: z.array(
          z
            .object({
              id,
              name: z.string(),
              station: id,
              kind: z.enum(['skill', 'exam', 'workshop']),
              skill: station.optional(),
              blurb: z.string(),
              cost: sourced,
              costPerLevel: sourced,
              days: sourced,
              questions: sourced.optional(),
              passScore: sourced.optional(),
              effects: z.array(effect).optional(),
              sets_flags: z.array(id).optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    training,
  ],
  'examQuestions.json': [
    z
      .object({
        _readme: readme,
        questions: z.array(
          z
            .object({
              id,
              topic: z.string(),
              question: z.string().max(60),
              choices: z.array(z.string().max(21)).length(4),
              answer: z.number().int().min(0).max(3),
            })
            .strict(),
        ),
      })
      .strict(),
    examQuestions,
  ],
  'industryReports.json': [
    z
      .object({
        _readme: readme,
        reports: z.array(
          z
            .object({
              id,
              month: z.number().int().min(1).max(12),
              stat_id: id,
              headline: z.string().max(24),
              body: z.string().includes('{value}'),
              event: id.optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    industryReports,
  ],
  'customers.json': [
    z
      .object({
        _readme: readme,
        names: z.array(z.string().max(12)).min(5),
        bigCustomerNames: z.array(z.string().max(20)).min(1),
        requests: z.record(id, z.array(z.string()).min(1)),
        reactions: z.object({ great: z.array(z.string()), ok: z.array(z.string()), bad: z.array(z.string()) }).strict(),
      })
      .strict(),
    customers,
  ],
  'dialogue.json': [z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])), dialogue],
  'shopLayout.json': [layout, shopLayout],
  'trainingLayout.json': [layout, trainingLayout],
};

describe('every JSON data file matches its schema', () => {
  for (const [file, [schema, data]] of Object.entries(SCHEMAS)) {
    it(file, () => {
      const r = schema.safeParse(data);
      expect(r.success, r.success ? '' : `${file}: ${JSON.stringify(r.error.issues.slice(0, 3), null, 1)}`).toBe(true);
    });
  }

  it('covers every JSON file in src/data', () => {
    const files = Object.keys(import.meta.glob('../src/data/*.json')).map((p) => p.split('/').pop());
    expect(files.sort()).toEqual(Object.keys(SCHEMAS).sort());
  });
});

describe('every displayed stat has a source', () => {
  it('stats shown in the ledger and in Industry Reports all have a source_id', () => {
    for (const s of STATS) expect(s.source_id.length, s.id).toBeGreaterThan(0);
    for (const r of REPORTS) expect(STATS.find((s) => s.id === r.stat_id)?.source_id, r.id).toBeTruthy();
  });
});
