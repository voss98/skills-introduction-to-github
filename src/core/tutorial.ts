import raw from '../data/tutorial.json';
import type { GameState } from './gameState';

export type TutorialTrigger = 'first_morning' | 'job_accepted' | 'first_minigame' | 'bike_ready' | 'first_payment' | 'first_closing';

export interface TutorialTip {
  id: string;
  trigger: TutorialTrigger;
  pages: string[];
}

export const TUTORIAL_TIPS: TutorialTip[] = raw.tips as TutorialTip[];

/**
 * The tip to show for this trigger, or null if the tutorial is off or it was
 * already shown this run. Marks it as shown.
 */
export function nextTip(trigger: TutorialTrigger, state: GameState, enabled: boolean): TutorialTip | null {
  if (!enabled) return null;
  const tip = TUTORIAL_TIPS.find((t) => t.trigger === trigger && !state.hasSeenTutorial(t.id));
  if (!tip) return null;
  state.markTutorial(tip.id);
  return tip;
}
