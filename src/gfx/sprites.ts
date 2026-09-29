/**
 * All game art, generated as pixel grids. '0'..'3' are palette shades
 * (0 darkest), '.' is transparent. Built with a few drawing primitives so the
 * shapes stay readable in code.
 */
export class PixelGrid {
  readonly cells: string[][];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  }

  set(x: number, y: number, s: number | string): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = String(s);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, s: number, fill: number | null = s): this {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const edge = yy === y || yy === y + h - 1 || xx === x || xx === x + w - 1;
        if (edge) this.set(xx, yy, s);
        else if (fill !== null) this.set(xx, yy, fill);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, s: number): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, s);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  circle(cx: number, cy: number, r: number, s: number): this {
    let x = r;
    let y = 0;
    let err = 1 - r;
    while (x >= y) {
      for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) {
        this.set(cx + a, cy + b, s);
      }
      y++;
      if (err < 0) err += 2 * y + 1;
      else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
    return this;
  }

  /** Paste rows of art at an offset ('.' stays transparent). */
  paste(rows: string[], ox: number, oy: number): this {
    rows.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && this.set(ox + x, oy + y, c)));
    return this;
  }

  rows(): string[] {
    return this.cells.map((r) => r.join(''));
  }
}

/** Swap shades, e.g. to recolour the player into a customer. */
export function recolor(rows: string[], map: Record<string, string>): string[] {
  return rows.map((r) => [...r].map((c) => map[c] ?? c).join(''));
}

// ---------- Tiles (8x8) ----------

export const TILE_FRAMES = {
  solid: 0,
  oneway: 1,
  ladder: 2,
  wall: 3,
  wallTrim: 4,
} as const;

export function tileArt(): string[][] {
  const solid = [
    '00000000',
    '11111111',
    '12212221',
    '11111111',
    '22122212',
    '11111111',
    '21222122',
    '11111111',
  ];
  const oneway = [
    '00000000',
    '22222222',
    '11111111',
    '00000000',
    '.0....0.',
    '..0..0..',
    '...00...',
    '........',
  ];
  const ladder = [
    '.1....1.',
    '.1....1.',
    '.000000.',
    '.1....1.',
    '.1....1.',
    '.1....1.',
    '.000000.',
    '.1....1.',
  ];
  const wall = [
    '33333333',
    '32333233',
    '33333333',
    '33333333',
    '33333333',
    '33323332',
    '33333333',
    '33333333',
  ];
  const wallTrim = [
    '22222222',
    '33333333',
    '32323232',
    '33333333',
    '32323232',
    '33333333',
    '32323232',
    '33333333',
  ];
  return [solid, oneway, ladder, wall, wallTrim];
}

// ---------- Player (8x14) ----------

const HEAD = ['..0000..', '.011110.', '.0000000', '.033303.', '.033333.', '..0330..'];
const HEAD_BACK = ['..0000..', '.011110.', '.000000.', '.000000.', '.000000.', '..0000..'];

export const PLAYER_FRAMES = { idle: 0, walk1: 1, walk2: 2, jump: 3, climb1: 4, climb2: 5 } as const;

export function playerArt(): string[][] {
  const torso = ['.011110.', '01122110', '01122110', '03122130', '..1221..'];
  const idle = [...HEAD, ...torso, '..1..1..', '..0..0..', '.00..00.'];
  const walk1 = [...HEAD, ...torso, '.1....1.', '.0....0.', '00....00'];
  const walk2 = [...HEAD, ...torso, '...11...', '...00...', '..0000..'];
  const jump = [...HEAD, '30111103', '01122110', '.112211.', '..1221..', '..1221..', '.11..11.', '.00..00.', '........'];
  const climb1 = [...HEAD_BACK, '301111..', '01111110', '01111113', '.011110.', '..1111..', '..1..1..', '..0..1..', '.....0..'];
  const climb2 = [...HEAD_BACK, '..111103', '01111110', '31111110', '.011110.', '..1111..', '..1..1..', '..1..0..', '..0.....'];
  return [idle, walk1, walk2, jump, climb1, climb2];
}

export function customerArt(): string[][] {
  // Customers wear a helmet (light) and a dark jersey.
  return playerArt()
    .slice(0, 3)
    .map((f) => recolor(f, { '1': '2', '2': '1' }));
}

// ---------- Stations and decor ----------

function bench(w: number, h: number): PixelGrid {
  const g = new PixelGrid(w, h);
  g.rect(0, h - 10, w, 2, 0);
  g.rect(1, h - 8, 2, 8, 1);
  g.rect(w - 3, h - 8, 2, 8, 1);
  g.line(1, h - 4, w - 2, h - 4, 1);
  return g;
}

export function stationArt(): Record<string, string[]> {
  const frameJig = new PixelGrid(24, 24)
    .rect(3, 22, 18, 2, 0)
    .rect(11, 6, 2, 16, 1)
    .rect(9, 3, 6, 3, 0, 2)
    // bike frame clamped in the jig
    .line(6, 7, 17, 9, 0)
    .line(6, 7, 9, 15, 0)
    .line(17, 9, 9, 15, 0)
    .line(9, 15, 2, 16, 0)
    .line(6, 7, 2, 16, 0)
    .line(17, 9, 18, 13, 1)
    .circle(9, 15, 1, 1);

  const wheelStand = new PixelGrid(16, 24)
    .rect(1, 22, 14, 2, 0)
    .rect(1, 6, 2, 16, 1)
    .rect(13, 6, 2, 16, 1)
    .line(3, 10, 13, 10, 2)
    .line(8, 4, 8, 16, 2)
    .line(4, 6, 12, 14, 2)
    .line(4, 14, 12, 6, 2)
    .circle(8, 10, 6, 0)
    .circle(8, 10, 5, 1)
    .rect(7, 9, 3, 3, 0);

  const drivetrain = bench(24, 16)
    .circle(6, 2, 2, 0)
    .set(6, 2, 1)
    .rect(12, 3, 1, 3, 0)
    .rect(14, 2, 1, 4, 0)
    .rect(16, 1, 1, 5, 0)
    .rect(18, 0, 1, 6, 0)
    .line(6, 0, 18, 0, 1);

  const suspension = bench(24, 16)
    .rect(4, 0, 7, 1, 0)
    .line(5, 0, 5, 5, 0)
    .line(9, 0, 9, 5, 0)
    .line(7, 0, 7, 3, 1)
    .rect(14, 2, 8, 3, 0, 2)
    .line(15, 3, 20, 3, 1);

  const parts = new PixelGrid(24, 28).rect(0, 0, 24, 28, 0, 2);
  for (const y of [9, 18, 26]) parts.line(1, y, 22, y, 0);
  parts
    .circle(6, 4, 3, 0)
    .circle(6, 4, 1, 1)
    .circle(17, 4, 3, 0)
    .circle(17, 4, 1, 1)
    .rect(2, 12, 5, 6, 0, 1)
    .rect(8, 14, 5, 4, 0, 3)
    .rect(14, 11, 7, 7, 0, 1)
    .rect(2, 21, 6, 5, 0, 3)
    .rect(9, 20, 4, 6, 0, 1)
    .rect(14, 22, 8, 4, 0, 3);

  const counter = new PixelGrid(24, 16)
    .rect(0, 5, 24, 11, 0, 1)
    .rect(0, 4, 24, 2, 0)
    .line(2, 9, 21, 9, 2)
    .line(2, 12, 21, 12, 2)
    .rect(15, 0, 7, 5, 0, 2)
    .set(17, 2, 0)
    .set(19, 2, 0);

  const door = new PixelGrid(16, 28)
    .rect(0, 0, 16, 28, 0, 1)
    .rect(2, 3, 12, 6, 0, 3)
    .line(4, 6, 11, 6, 1)
    .rect(2, 11, 12, 15, 0, 2)
    .rect(10, 17, 3, 4, 0, 3)
    .circle(11, 16, 1, 0);

  const rack = new PixelGrid(32, 16).line(0, 15, 31, 15, 0);
  for (const x of [5, 21]) {
    rack.circle(x, 11, 4, 0).circle(x + 8, 11, 4, 0).line(x, 11, x + 4, 7, 1).line(x + 4, 7, x + 8, 11, 1).line(x + 4, 7, x + 3, 5, 0);
  }

  const shopDoor = new PixelGrid(8, 24).rect(0, 0, 8, 24, 0, 2).rect(2, 3, 4, 8, 1, 3).set(6, 14, 0);

  const desk = bench(24, 16).rect(3, 1, 8, 5, 0, 3).line(5, 3, 9, 3, 1).rect(15, 2, 5, 4, 0, 1);

  return {
    front_counter: counter.rows(),
    parts_wall: parts.rows(),
    frame_jig: frameJig.rows(),
    wheel_stand: wheelStand.rows(),
    drivetrain_bench: drivetrain.rows(),
    suspension_bench: suspension.rows(),
    training_door: door.rows(),
    bike_rack: rack.rows(),
    shop_door: shopDoor.rows(),
    desk: desk.rows(),
  };
}

export function trainingArt(): Record<string, string[]> {
  // Wheel Building Academy: a wheel on a truing stand beside a spoke rack.
  const academy = new PixelGrid(24, 24).rect(0, 22, 24, 2, 0).rect(2, 8, 2, 14, 1).rect(10, 8, 2, 14, 1);
  academy.circle(7, 12, 5, 0).circle(7, 12, 4, 1).rect(6, 11, 3, 3, 0);
  for (let x = 15; x < 23; x += 2) academy.line(x, 4, x, 21, x % 4 === 3 ? 0 : 1);
  academy.rect(14, 2, 10, 3, 0, 2);
  // Suspension Lab: a fork on a dyno stand with an oil jug.
  const lab = bench(24, 16).rect(3, 0, 7, 1, 0).line(4, 0, 4, 5, 0).line(8, 0, 8, 5, 0).rect(13, 1, 5, 5, 0, 3).rect(14, 0, 3, 1, 0).line(19, 0, 22, 5, 1);
  // Certification Exam: a desk with a test paper and a pencil.
  const exam = bench(24, 16).rect(4, 1, 9, 5, 0, 3).line(6, 3, 11, 3, 1).line(6, 5, 9, 5, 1).line(15, 5, 20, 0, 0).set(20, 0, 1);
  // Customer Service Workshop: a counter with two speech bubbles.
  const cs = new PixelGrid(24, 24).rect(0, 12, 24, 12, 0, 1).rect(0, 11, 24, 2, 0).rect(1, 0, 10, 7, 0, 3).set(4, 7, 0).set(3, 8, 0);
  cs.rect(13, 2, 10, 6, 0, 3).set(19, 8, 0).set(20, 9, 0).line(3, 3, 8, 3, 1).line(15, 5, 20, 5, 1).line(2, 17, 21, 17, 2);
  const exit = new PixelGrid(16, 24).rect(0, 0, 16, 24, 0, 2).rect(3, 3, 10, 8, 1, 3).line(5, 7, 10, 7, 0).line(8, 5, 10, 7, 0).line(8, 9, 10, 7, 0).set(12, 15, 0);
  return { wheel_academy: academy.rows(), suspension_lab: lab.rows(), cert_exam: exam.rows(), cs_workshop: cs.rows(), exit_door: exit.rows() };
}

/** Small bouncing "A" prompt shown over interactable stations. */
export function promptArt(): string[] {
  return ['.00000.', '0333330', '0330330', '0303030', '0300030', '0303030', '0333330', '.00000.', '...0...'];
}
