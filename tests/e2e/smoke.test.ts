import { existsSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';

/**
 * End-to-end smoke test: boots the real game in headless Chromium, starts a
 * new game, completes a job, makes a decision, and reaches an ending
 * (?runDays=1 makes the run one day long). Inputs go through real key events.
 */

function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (existsSync(root)) {
    for (const dir of readdirSync(root).filter((d: string) => /^chromium-\d+$/.test(d))) {
      const exe = `${root}/${dir}/chrome-linux/chrome`;
      if (existsSync(exe)) return exe;
    }
  }
  try {
    const exe = chromium.executablePath();
    return existsSync(exe) ? exe : undefined;
  } catch {
    return undefined;
  }
}

const exe = findChromium();
if (!exe) console.warn('[smoke] No Chromium found: set CHROMIUM_PATH or run `npx playwright-core install chromium`. Skipping.');

describe.skipIf(!exe)('end-to-end smoke test', () => {
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;
  const errors: string[] = [];

  beforeAll(async () => {
    server = await createServer({ logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
    await server.listen();
    browser = await chromium.launch({ executablePath: exe });
    page = await browser.newPage({ viewport: { width: 700, height: 660 } });
    page.on('pageerror', (e) => errors.push(e.message));
    const url = server.resolvedUrls!.local[0];
    await page.goto(`${url}?seed=3&runDays=1&job=flat_tire`);
    await page.waitForFunction(() => (window as any).game?.scene?.getScene('Title')?.sys.isActive(), null, { timeout: 30000 });
  }, 60000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  const ev = <T>(fn: string) => page.evaluate(fn) as Promise<T>;
  const tap = async (code: string) => {
    await page.keyboard.down(code);
    await page.waitForTimeout(40);
    await page.keyboard.up(code);
    await page.waitForTimeout(90);
  };
  const dialogOpen = () => ev<boolean>("game.scene.getScene('Dialog').isOpen");
  const minigameOn = () => ev<boolean>("game.scene.getScene('Minigame').sys.isActive()");
  /** Press A through text boxes (first choice on menus) until `done` holds. */
  const advanceUntil = async (done: string, max = 200) => {
    for (let i = 0; i < max; i++) {
      if (await ev<boolean>(done)) return;
      if ((await dialogOpen()) && !(await minigameOn())) await tap('KeyX');
      else await page.waitForTimeout(100);
    }
    throw new Error(`timed out waiting for: ${done}`);
  };
  const P = "game.scene.getScene('Shop').world.player";
  const walkTo = async (x: number) => {
    const cx = await ev<number>(`${P}.centerX`);
    const key = cx < x ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(key);
    await page.waitForFunction(`${P}.centerX ${cx < x ? '>=' : '<='} ${x}`, null, { timeout: 10000 });
    await page.keyboard.up(key);
    await page.waitForTimeout(150);
  };

  /** Open the Start menu and pick an item by label. */
  const menu = async (label: string) => {
    await page.waitForTimeout(300);
    await tap('Enter');
    await page.waitForFunction("!!game.scene.getScene('Dialog').opts?.choices");
    await page.waitForTimeout(500);
    for (let i = 0; i < 12; i++) {
      const cur = await ev<string>("(()=>{const d=game.scene.getScene('Dialog'); return d.opts.choices[d.cursorIdx].label})()");
      if (cur === label) break;
      await tap('ArrowDown');
    }
    await tap('KeyX');
  };

  it('starts a new game, completes a job, makes a decision, saves, continues and reaches an ending', async () => {
    // Title -> New Game.
    await tap('Enter');
    await page.waitForFunction(() => (window as any).game.scene.getScene('Shop').sys.settings.status >= 5);

    // Morning text + monthly Industry Report decision (A picks the first option).
    await advanceUntil("!game.scene.getScene('Dialog').isOpen && !game.scene.getScene('Shop').busy");
    const decisions = await ev<number>("game.scene.getScene('Shop').decisionsMade()");
    expect(decisions).toBeGreaterThan(0);

    // A bot plays minigames through real key events.
    await page.evaluate(() => {
      const send = (code: string, type: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
      const codes: Record<string, string> = { UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', A: 'KeyX', B: 'KeyZ' };
      let holding = false;
      let lastIdx = -1;
      let last = 0;
      const loop = () => {
        const sc = (window as any).game.scene.getScene('Minigame');
        const now = performance.now();
        if (sc?.sys.isActive() && sc.d && sc.finished && now - last > 400) {
          send('KeyX', 'keydown');
          setTimeout(() => send('KeyX', 'keyup'), 40);
          last = now;
        } else if (sc?.sys.isActive() && sc.d && !sc.finished) {
          const g = sc.d.game;
          if (g.kind === 'timing' && Math.abs(g.pos - g.zoneCenter) < 0.03 && now - last > 150) {
            send('KeyX', 'keydown');
            setTimeout(() => send('KeyX', 'keyup'), 40);
            last = now;
          } else if (g.kind === 'sequence' && g.index !== lastIdx && now - last > 150) {
            const c = codes[g.sequence[g.index]];
            send(c, 'keydown');
            setTimeout(() => send(c, 'keyup'), 40);
            lastIdx = g.index;
            last = now;
          } else if (g.kind === 'torque') {
            if (!holding) {
              send('KeyX', 'keydown');
              holding = true;
            } else if (g.value >= g.params.targetNm) {
              send('KeyX', 'keyup');
              holding = false;
            }
          }
        }
        requestAnimationFrame(loop);
      };
      loop();
    });

    // Front counter: accept the flat tire.
    await walkTo(20);
    await tap('KeyX');
    await advanceUntil("!!game.scene.getScene('Shop').shop.activeJob && !game.scene.getScene('Dialog').isOpen");

    // Wheel truing stand: start the task, the bot plays, close the result.
    await walkTo(136);
    await tap('KeyX');
    await advanceUntil("game.scene.getScene('Shop').shop.activeJob.tasks.every(t => t.done) && !game.scene.getScene('Dialog').isOpen && !game.scene.getScene('Minigame').sys.isActive()");

    // Hand the bike back and get paid.
    const cashBefore = await ev<number>("game.scene.getScene('Shop').shop.state.cash");
    await walkTo(20);
    await tap('KeyX');
    await advanceUntil("!game.scene.getScene('Shop').shop.activeJob && !game.scene.getScene('Dialog').isOpen");
    expect(await ev<number>("game.scene.getScene('Shop').shop.state.cash")).toBeGreaterThan(cashBefore);

    // Save & Quit, then Continue from the title: the run comes back as it was.
    const cashSaved = await ev<number>("game.scene.getScene('Shop').shop.state.cash");
    await menu('SAVE & QUIT');
    await advanceUntil("game.scene.getScene('Title').sys.isActive()");
    await page.waitForTimeout(300);
    expect(await ev<string>("game.scene.getScene('Title').items[0].label")).toBe('CONTINUE');
    await tap('KeyX');
    await page.waitForFunction("game.scene.getScene('Shop').sys.isActive()");
    expect(await ev<number>("game.scene.getScene('Shop').shop.state.cash")).toBe(cashSaved);

    // Start menu -> END DAY -> YES, then through the end-of-day decision to the ending.
    await menu('END DAY');
    await advanceUntil("(()=>{const e=game.scene.getScene('Ending').sys; return e.isActive()||e.isPaused()})()");
    const endingId = await ev<string>("JSON.parse(localStorage.getItem('trail-shop-tycoon.gallery.v1'))[0]");
    expect(endingId).toBeTruthy();
    expect(errors).toEqual([]);
  }, 120000);
});
