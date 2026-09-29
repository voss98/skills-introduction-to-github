import layoutData from '../data/shopLayout.json';
import trainingData from '../data/trainingLayout.json';

export type TileKind = 'solid' | 'oneway' | 'ladder' | 'ladderTop' | 'empty';

export interface StationDef {
  id: string;
  name: string;
  /** Short label for tight text boxes. */
  short: string;
  tx: number;
  ty: number;
  w: number;
}

export type StationId =
  | 'front_counter'
  | 'parts_wall'
  | 'frame_jig'
  | 'wheel_stand'
  | 'drivetrain_bench'
  | 'suspension_bench'
  | 'training_door';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShopLayout {
  tileSize: number;
  cols: number;
  rows: number;
  tiles: TileKind[][];
  playerStart: { tx: number; ty: number };
  stations: StationDef[];
  decor: { sprite: string; tx: number; ty: number; w: number }[];
}

const CHAR_TO_TILE: Record<string, TileKind> = {
  '#': 'solid',
  '=': 'oneway',
  H: 'ladder',
  L: 'ladderTop',
  '.': 'empty',
};

export interface LayoutData {
  tileSize: number;
  rows: string[];
  playerStart: { tx: number; ty: number };
  stations: StationDef[];
  decor: { sprite: string; tx: number; ty: number; w: number }[];
}

export function parseLayout(data: LayoutData): ShopLayout {
  const tiles = data.rows.map((row, y) =>
    [...row].map((c, x) => {
      const t = CHAR_TO_TILE[c];
      if (!t) throw new Error(`Unknown tile '${c}' at ${x},${y}`);
      return t;
    }),
  );
  return {
    tileSize: data.tileSize,
    cols: tiles[0].length,
    rows: tiles.length,
    tiles,
    playerStart: data.playerStart,
    stations: data.stations,
    decor: data.decor,
  };
}

export const SHOP_LAYOUT = parseLayout(layoutData);
export const TRAINING_LAYOUT = parseLayout(trainingData as LayoutData);

export const tileAt = (l: ShopLayout, tx: number, ty: number): TileKind =>
  tx < 0 || ty < 0 || tx >= l.cols || ty >= l.rows ? 'solid' : l.tiles[ty][tx];

/** Can the player stand on top of this tile? */
export const isSupport = (t: TileKind) => t === 'solid' || t === 'oneway' || t === 'ladderTop';
export const isLadder = (t: TileKind) => t === 'ladder' || t === 'ladderTop';

/** Merge horizontal runs of a tile kind into rectangles (pixel units) for physics bodies. */
export function runsOf(l: ShopLayout, kinds: TileKind[]): Rect[] {
  const out: Rect[] = [];
  const ts = l.tileSize;
  for (let y = 0; y < l.rows; y++) {
    let start = -1;
    for (let x = 0; x <= l.cols; x++) {
      const hit = x < l.cols && kinds.includes(l.tiles[y][x]);
      if (hit && start < 0) start = x;
      if (!hit && start >= 0) {
        out.push({ x: start * ts, y: y * ts, w: (x - start) * ts, h: ts });
        start = -1;
      }
    }
  }
  return out;
}

/** Vertical ladder columns in pixels: from the top of the ladder-top tile down to the floor. */
export function ladderRects(l: ShopLayout): Rect[] {
  const out: Rect[] = [];
  const ts = l.tileSize;
  for (let x = 0; x < l.cols; x++) {
    let start = -1;
    for (let y = 0; y <= l.rows; y++) {
      const hit = y < l.rows && isLadder(l.tiles[y][x]);
      if (hit && start < 0) start = y;
      if (!hit && start >= 0) {
        out.push({ x: x * ts, y: start * ts, w: ts, h: (y - start) * ts });
        start = -1;
      }
    }
  }
  return out;
}

/**
 * Tile cells the player can stand in, reachable from the start by walking,
 * falling, jumping (up to `jumpTiles` high, `reachTiles` across) and climbing.
 * A coarse model used to check that every station can be reached.
 */
export function reachableCells(l: ShopLayout, jumpTiles: number, reachTiles: number): Set<string> {
  const key = (x: number, y: number) => `${x},${y}`;
  const open = (x: number, y: number) => tileAt(l, x, y) !== 'solid';
  const standable = (x: number, y: number) =>
    open(x, y) && tileAt(l, x, y) !== 'oneway' && tileAt(l, x, y) !== 'ladderTop' && isSupport(tileAt(l, x, y + 1));
  const onLadder = (x: number, y: number) => isLadder(tileAt(l, x, y));

  const seen = new Set<string>();
  const queue: [number, number][] = [[l.playerStart.tx, l.playerStart.ty]];
  const push = (x: number, y: number) => {
    if (!seen.has(key(x, y))) {
      seen.add(key(x, y));
      queue.push([x, y]);
    }
  };
  seen.add(key(l.playerStart.tx, l.playerStart.ty));

  const fall = (x: number, y: number) => {
    let yy = y;
    while (open(x, yy) && !isSupport(tileAt(l, x, yy + 1)) && yy < l.rows) yy++;
    if (open(x, yy)) push(x, yy);
  };

  while (queue.length) {
    const [x, y] = queue.shift()!;
    // Walk (and fall off edges)
    for (const dx of [-1, 1]) {
      if (open(x + dx, y) && tileAt(l, x + dx, y) !== 'oneway') {
        if (standable(x + dx, y)) push(x + dx, y);
        else fall(x + dx, y);
      }
    }
    // Climb
    if (onLadder(x, y + 1) || onLadder(x, y)) {
      for (let yy = y; yy < l.rows && (onLadder(x, yy + 1) || onLadder(x, yy)); yy++) {
        if (standable(x, yy)) push(x, yy);
      }
      for (let yy = y; yy > 0 && onLadder(x, yy); yy--) {
        if (standable(x, yy - 1)) push(x, yy - 1);
      }
    }
    // Jump: rise through open or one-way tiles, land on any standable cell in range.
    if (standable(x, y)) {
      for (let dy = 1; dy <= jumpTiles; dy++) {
        if (tileAt(l, x, y - dy) === 'solid') break;
        for (let dx = -reachTiles; dx <= reachTiles; dx++) {
          if (standable(x + dx, y - dy)) push(x + dx, y - dy);
        }
      }
    }
  }
  return seen;
}
