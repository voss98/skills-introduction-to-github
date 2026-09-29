import Phaser from 'phaser';
import sourcesMd from '../data/sources.md?raw';
import { compactStat, formatStat, parseSources, STATS, type Stat } from '../core/stats';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';

const PER_PAGE = 10;
const SOURCES = parseSources(sourcesMd);

export interface LedgerData {
  onClose: () => void;
}

/** "Shop Ledger": a paged list of the real-world stats behind the game. A shows the source. */
export class LedgerScene extends Phaser.Scene {
  private d!: LedgerData;
  private page = 0;
  private cursor = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private header!: Phaser.GameObjects.BitmapText;
  private cursorText!: Phaser.GameObjects.BitmapText;
  private busy = false;

  constructor() {
    super('Ledger');
  }

  init(data: LedgerData): void {
    this.d = data;
    this.page = 0;
    this.cursor = 0;
    this.busy = false;
  }

  private get pages() {
    return Math.ceil(STATS.length / PER_PAGE);
  }

  private get current(): Stat[] {
    return STATS.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE_HEX[3]).fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawWindow(g, 0, 0, SCREEN_W, 16);
    this.header = addText(this, 6, 5, '', 0);
    this.rows = Array.from({ length: PER_PAGE }, (_, i) => addText(this, 10, 20 + i * 10, '', 0));
    this.cursorText = addText(this, 4, 20, ']', 0);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, SCREEN_H - 10, SCREEN_W, 10);
    addText(this, 2, SCREEN_H - 9, 'A:SOURCE {}:PAGE *=EST.', 2);
    this.render();
  }

  private render(): void {
    setText(this.header, `SHOP LEDGER  ${this.page + 1}/${this.pages}`);
    const items = this.current;
    this.rows.forEach((row, i) => {
      const s = items[i];
      const name = `${s?.confidence === 'estimate' ? '*' : ''}${s?.short ?? ''}`;
      setText(row, s ? `${name.padEnd(17)}${compactStat(s).padStart(7)}` : '');
    });
    this.cursorText.setY(20 + this.cursor * 10);
  }

  update(time: number): void {
    if (this.busy) return;
    this.cursorText.setVisible(Math.floor(time / 400) % 4 !== 0);
    const n = this.current.length;
    if (gamepad.justPressed('DOWN')) this.cursor = (this.cursor + 1) % n;
    if (gamepad.justPressed('UP')) this.cursor = (this.cursor - 1 + n) % n;
    if (gamepad.justPressed('RIGHT') || gamepad.justPressed('LEFT')) {
      const dir = gamepad.justPressed('RIGHT') ? 1 : -1;
      this.page = (this.page + dir + this.pages) % this.pages;
      this.cursor = Math.min(this.cursor, this.current.length - 1);
    }
    this.render();
    if (gamepad.justPressed('A')) void this.showSource(this.current[this.cursor]);
    else if (gamepad.justPressed('B') || gamepad.justPressed('START')) {
      gamepad.consume('B');
      gamepad.consume('START');
      this.scene.stop();
      this.d.onClose();
    }
  }

  private async showSource(s: Stat): Promise<void> {
    this.busy = true;
    const src = SOURCES[s.source_id];
    const pages = [`${s.label}\n${formatStat(s)}\nYEAR ${s.year}${s.confidence === 'estimate' ? '\nESTIMATE' : ''}`];
    if (s.confidence === 'estimate') pages.push(`WHY AN ESTIMATE: ${s.note ?? ''}`);
    else pages.push(`SOURCE: ${src?.publisher ?? s.source_id}`, `${src?.title ?? ''}\n${src?.year ?? ''}`);
    await showDialog(this, { speaker: 'LEDGER', pages });
    this.busy = false;
  }
}

/** Short publisher names for news tickers, e.g. "PEOPLEFORBIKES". */
export function publisherShortNames(): Record<string, string> {
  return Object.fromEntries(
    Object.values(SOURCES).map((s) => [s.id, s.publisher.split(/,| reporting| citing|\(/)[0].trim().toUpperCase()]),
  );
}
