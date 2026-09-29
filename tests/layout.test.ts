import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/core/balance';
import { isSupport, ladderRects, reachableCells, runsOf, SHOP_LAYOUT, tileAt } from '../src/core/layout';

const L = SHOP_LAYOUT;
const { jumpVelocity, gravity } = BALANCE.movement;
const jumpTiles = Math.floor((jumpVelocity * jumpVelocity) / (2 * gravity) / L.tileSize);

describe('shop layout', () => {
  it('is a closed rectangle', () => {
    for (let x = 0; x < L.cols; x++) {
      expect(tileAt(L, x, 0)).toBe('solid');
      expect(tileAt(L, x, L.rows - 1)).toBe('solid');
    }
    for (let y = 0; y < L.rows; y++) {
      expect(tileAt(L, 0, y)).toBe('solid');
      expect(tileAt(L, L.cols - 1, y)).toBe('solid');
    }
  });

  it('has every required station plus the locked training door', () => {
    const ids = L.stations.map((s) => s.id).sort();
    expect(ids).toEqual(
      ['drivetrain_bench', 'frame_jig', 'front_counter', 'parts_wall', 'suspension_bench', 'training_door', 'wheel_stand'].sort(),
    );
  });

  it('has platforms, a ladder and a mezzanine', () => {
    expect(ladderRects(L).length).toBeGreaterThan(0);
    const onewayRows = new Set<number>();
    L.tiles.forEach((row, y) => row.forEach((t) => (t === 'oneway' || t === 'ladderTop') && onewayRows.add(y)));
    expect(onewayRows.size).toBeGreaterThanOrEqual(3);
    // Mezzanine: a one-way floor at least 15 tiles long.
    const longest = Math.max(...runsOf(L, ['oneway', 'ladderTop']).map((r) => r.w / L.tileSize));
    expect(longest).toBeGreaterThanOrEqual(15);
  });

  it('stands every station on a floor or platform', () => {
    for (const s of L.stations) {
      for (let x = s.tx; x < s.tx + s.w; x++) {
        expect(isSupport(tileAt(L, x, s.ty + 1)), `${s.id} tile ${x}`).toBe(true);
      }
    }
  });

  it('lets the player reach every station by walking, jumping and climbing', () => {
    const reach = reachableCells(L, jumpTiles, 2);
    for (const s of L.stations) {
      const cells = Array.from({ length: s.w }, (_, i) => `${s.tx + i},${s.ty}`);
      expect(cells.some((c) => reach.has(c)), s.id).toBe(true);
    }
  });

  it('needs the ladder or jumps to reach the mezzanine (not reachable by walking alone)', () => {
    const walkOnly = reachableCells({ ...L, tiles: L.tiles.map((r) => r.map((t) => (t === 'ladder' || t === 'ladderTop' ? (t === 'ladderTop' ? 'oneway' : 'empty') : t))) }, 0, 0);
    const susp = L.stations.find((s) => s.id === 'suspension_bench')!;
    expect(walkOnly.has(`${susp.tx},${susp.ty}`)).toBe(false);
  });
});
