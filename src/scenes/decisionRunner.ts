import type Phaser from 'phaser';
import { describeDiff, END, type DecisionEngine } from '../core/decisions';
import type { Trigger } from '../core/shop';
import { showDialog } from './DialogScene';

/**
 * Play the decision event for a trigger as RPG text boxes: A advances text,
 * the D-pad and A pick a choice, and a "RESULT" box shows what changed.
 * Returns the id of the event that ran, or null if none was eligible.
 */
export async function runDecision(scene: Phaser.Scene, engine: DecisionEngine, trigger: Trigger): Promise<string | null> {
  const event = engine.begin(trigger);
  if (!event) return null;
  let id = event.entry;
  while (id !== END) {
    const view = engine.enter(id);
    if (view.choices.length) {
      let pick = -1;
      while (pick < 0) {
        pick = await showDialog(scene, {
          speaker: view.speaker,
          pages: [view.text],
          choices: view.choices.map((c) => ({ label: c.text, locked: c.locked })),
        });
      }
      const { next, diff } = engine.choose(id, pick);
      const lines = describeDiff(diff);
      if (lines.length) await showDialog(scene, { speaker: 'RESULT', pages: [lines.join('\n')] });
      id = next;
    } else {
      await showDialog(scene, { speaker: view.speaker, pages: [view.text] });
      id = engine.advance(id);
    }
  }
  return event.id;
}
