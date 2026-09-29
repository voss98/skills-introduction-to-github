import type { InputManager } from './InputManager';
import { GB_INPUTS, type GBInput } from './keymap';

/** Wire the physical keyboard into the input manager. */
export function bindKeyboard(manager: InputManager, target: Window = window): void {
  target.addEventListener('keydown', (e) => {
    if (manager.handleKeyDown(e.code)) {
      e.preventDefault(); // stop arrows scrolling the page
    }
  });
  target.addEventListener('keyup', (e) => {
    if (manager.handleKeyUp(e.code)) e.preventDefault();
  });
  target.addEventListener('blur', () => manager.releaseAll());
}

/** Wire the on-screen touch buttons (elements with data-input) into the input manager. */
export function bindTouchButtons(manager: InputManager, root: HTMLElement): void {
  const params = new URLSearchParams(window.location.search);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse || params.get('touch') === '1') document.body.classList.add('touch');

  root.querySelectorAll<HTMLButtonElement>('button[data-input]').forEach((btn) => {
    const input = btn.dataset.input as GBInput;
    if (!GB_INPUTS.includes(input)) return;
    const source = `touch:${input}`;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      btn.classList.add('held');
      manager.press(input, source);
    };
    const up = (e: PointerEvent) => {
      e.preventDefault();
      btn.classList.remove('held');
      manager.release(input, source);
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
