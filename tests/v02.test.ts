import { describe, expect, it } from 'vitest';
import { CHARS_PER_SECOND, DEFAULT_SETTINGS, TEXT_SPEEDS } from '../src/audio/settings';
import { chartPoints, rangeWithZero } from '../src/core/chart';
import { GameState, initialState, type GameStateData } from '../src/core/gameState';
import { restore, makeSave } from '../src/core/save';
import { ShopController } from '../src/core/shop';
import { nextTip, TUTORIAL_TIPS, type TutorialTrigger } from '../src/core/tutorial';

describe('first-day tutorial', () => {
  const triggers: TutorialTrigger[] = ['first_morning', 'job_accepted', 'first_minigame', 'bike_ready', 'first_payment', 'first_closing'];

  it('has one tip per trigger, each with short readable pages', () => {
    expect(TUTORIAL_TIPS.map((t) => t.trigger).sort()).toEqual([...triggers].sort());
    expect(new Set(TUTORIAL_TIPS.map((t) => t.id)).size).toBe(TUTORIAL_TIPS.length);
    for (const t of TUTORIAL_TIPS) for (const p of t.pages) expect(p.length, t.id).toBeLessThanOrEqual(150);
  });

  it('shows each tip once per run', () => {
    const s = new GameState();
    expect(nextTip('job_accepted', s, true)?.id).toBe('stations');
    expect(nextTip('job_accepted', s, true)).toBeNull();
    expect(s.snapshot.tutorialSeen).toEqual(['stations']);
  });

  it('shows nothing when the tutorial is turned off', () => {
    const s = new GameState();
    for (const t of triggers) expect(nextTip(t, s, false)).toBeNull();
    expect(s.snapshot.tutorialSeen).toEqual([]);
  });

  it('a new run shows the tips again', () => {
    const s = new GameState();
    nextTip('first_morning', s, true);
    s.reset();
    expect(nextTip('first_morning', s, true)?.id).toBe('welcome');
  });
});

describe('year chart data', () => {
  it('records one history entry per day at closing', () => {
    const s = new GameState();
    const shop = new ShopController(s, 3);
    shop.startDay();
    shop.endDay();
    shop.nextDay();
    shop.endDay();
    expect(s.snapshot.history.map((h) => h.day)).toEqual([1, 2]);
    expect(s.snapshot.history[1].cash).toBe(s.cash);
    expect(s.snapshot.history[1].reputation).toBe(s.reputation);
  });

  it('maps values into the box, higher values higher up', () => {
    const box = { x: 10, y: 20, w: 101, h: 41 };
    const pts = chartPoints([0, 50, 100], box, 0, 100);
    expect(pts).toEqual([
      { x: 10, y: 60 },
      { x: 60, y: 40 },
      { x: 110, y: 20 },
    ]);
    // Out-of-range values are clamped to the box.
    expect(chartPoints([500], box, 0, 100)[0].y).toBe(20);
  });

  it('the cash range always includes zero', () => {
    expect(rangeWithZero([500, 1500])).toEqual({ min: 0, max: 1500 });
    expect(rangeWithZero([-200, 900])).toEqual({ min: -200, max: 900 });
    expect(rangeWithZero([0, 0])).toEqual({ min: 0, max: 1 });
  });
});

describe('settings and saves', () => {
  it('new settings default to normal text, flashing on, tutorial on', () => {
    expect(DEFAULT_SETTINGS.textSpeed).toBe('normal');
    expect(DEFAULT_SETTINGS.reduceFlash).toBe(false);
    expect(DEFAULT_SETTINGS.tutorial).toBe(true);
  });

  it('text speeds get faster in order, ending in instant', () => {
    const cps = TEXT_SPEEDS.map((t) => CHARS_PER_SECOND[t]);
    for (let i = 1; i < cps.length; i++) expect(cps[i]).toBeGreaterThan(cps[i - 1]);
    expect(CHARS_PER_SECOND.instant).toBe(Infinity);
  });

  it('a v0.1 save (no history or tutorial fields) still loads', () => {
    const old = new GameState();
    const save = makeSave(old, new ShopController(old, 1));
    const { history: _h, tutorialSeen: _t, ...v01State } = save.state;
    const loaded = new GameState();
    restore({ ...save, state: v01State as GameStateData }, loaded);
    expect(loaded.snapshot.history).toEqual([]);
    expect(loaded.snapshot.tutorialSeen).toEqual([]);
    expect(loaded.cash).toBe(initialState().cash);
  });
});
