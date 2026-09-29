import { describe, expect, it } from 'vitest';
import { ButtonSequenceGame, createMinigame, TimingBarGame, TorqueMeterGame } from '../src/core/minigames';
import { TASKS } from '../src/core/jobs';
import { createRng } from '../src/core/rng';
import { FakePad, playBot } from './helpers';

describe('timing bar', () => {
  it('scores the centre of the zone highest and misses near zero', () => {
    expect(TimingBarGame.scoreHit(0.5, 0.5, 0.2)).toBe(100);
    expect(TimingBarGame.scoreHit(0.6, 0.5, 0.2)).toBe(60);
    expect(TimingBarGame.scoreHit(0.9, 0.5, 0.2)).toBe(0);
  });

  it('a good player scores high, a sloppy one scores low', () => {
    const task = TASKS.true_wheels;
    expect(playBot(createMinigame(task, 1, createRng(1)))).toBeGreaterThanOrEqual(85);
    expect(playBot(createMinigame(task, 1, createRng(1)), 0)).toBeLessThan(70);
  });

  it('records a miss if the player never presses', () => {
    const g = createMinigame(TASKS.fix_flat, 1, createRng(2)) as TimingBarGame;
    const pad = new FakePad();
    for (let i = 0; i < 2000 && !g.done; i++) g.update(16, pad);
    expect(g.done).toBe(true);
    expect(g.quality).toBe(0);
  });
});

describe('button sequence', () => {
  it('perfect input scores high; wrong presses cost points', () => {
    expect(playBot(createMinigame(TASKS.install_drivetrain, 1, createRng(3)))).toBeGreaterThanOrEqual(90);
    const g = createMinigame(TASKS.replace_pads, 1, createRng(3)) as ButtonSequenceGame;
    const pad = new FakePad();
    const wrong = g.sequence[0] === 'A' ? 'B' : 'A';
    pad.frame([wrong]);
    g.update(16, pad);
    expect(g.mistakes).toBe(1);
    expect(g.lastWrong).toBe(true);
  });
});

describe('torque meter', () => {
  it('rewards hitting the target and punishes over-torque more than under-torque', () => {
    expect(TorqueMeterGame.scoreBolt(5, 5, 0.1).score).toBe(100);
    const under = TorqueMeterGame.scoreBolt(3.5, 5, 0.1);
    const over = TorqueMeterGame.scoreBolt(6.5, 5, 0.1);
    expect(under.result).toBe('under');
    expect(over.result).toBe('over');
    expect(over.score).toBeLessThan(under.score);
  });

  it('ignores the A press that was already held when the game started', () => {
    const g = createMinigame(TASKS.install_cockpit, 1, createRng(1)) as TorqueMeterGame;
    const pad = new FakePad();
    pad.frame([], ['A']); // held, not freshly pressed
    for (let i = 0; i < 50; i++) g.update(16, pad);
    expect(g.value).toBe(0);
  });

  it('strips the bolt if A is held to the max', () => {
    const g = createMinigame(TASKS.install_cockpit, 1, createRng(1)) as TorqueMeterGame;
    const pad = new FakePad();
    pad.frame(['A']);
    g.update(16, pad);
    pad.frame([], ['A']);
    for (let i = 0; i < 1000 && g.results.length === 0; i++) g.update(16, pad);
    expect(g.results[0]).toBe('stripped');
  });

  it('scores a well-timed release highly', () => {
    expect(playBot(createMinigame(TASKS.install_brakes, 1, createRng(1)))).toBeGreaterThanOrEqual(85);
    expect(playBot(createMinigame(TASKS.install_brakes, 1, createRng(1)), 0)).toBeLessThan(40);
  });
});

describe('difficulty reads station skill', () => {
  it('higher skill widens the timing zone', () => {
    const lo = createMinigame(TASKS.true_wheels, 1, createRng(1)) as TimingBarGame;
    const hi = createMinigame(TASKS.true_wheels, 5, createRng(1)) as TimingBarGame;
    expect(hi.params.zoneWidth).toBeGreaterThan(lo.params.zoneWidth);
    expect(hi.params.speed).toBeLessThan(lo.params.speed);
  });

  it('higher skill shortens sequences and gives more time per step', () => {
    const lo = createMinigame(TASKS.service_fork, 1, createRng(1)) as ButtonSequenceGame;
    const hi = createMinigame(TASKS.service_fork, 5, createRng(1)) as ButtonSequenceGame;
    expect(hi.sequence.length).toBeLessThan(lo.sequence.length);
    expect(hi.params.stepTimeMs).toBeGreaterThan(lo.params.stepTimeMs);
  });

  it('higher skill widens torque tolerance', () => {
    const lo = createMinigame(TASKS.install_shock, 1, createRng(1)) as TorqueMeterGame;
    const hi = createMinigame(TASKS.install_shock, 5, createRng(1)) as TorqueMeterGame;
    expect(hi.params.tolerance).toBeGreaterThan(lo.params.tolerance);
  });
});
