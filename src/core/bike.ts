/** A bike is a set of components. Builds start empty; repairs arrive with worn parts. */
export const COMPONENT_SLOTS = ['frame', 'fork', 'shock', 'wheels', 'tires', 'drivetrain', 'brakes', 'cockpit'] as const;
export type ComponentSlot = (typeof COMPONENT_SLOTS)[number];

export interface Component {
  slot: ComponentSlot;
  installed: boolean;
  /** 0 (broken) .. 100 (perfect). */
  condition: number;
}

export interface Bike {
  owner: string;
  components: Record<ComponentSlot, Component>;
}

const allSlots = (fn: (slot: ComponentSlot) => Component) =>
  Object.fromEntries(COMPONENT_SLOTS.map((s) => [s, fn(s)])) as Record<ComponentSlot, Component>;

/** A frame kit in a box: nothing installed yet. */
export function newBuildKit(owner: string): Bike {
  return { owner, components: allSlots((slot) => ({ slot, installed: false, condition: 0 })) };
}

/** A customer's ridden bike: everything installed, a few parts worn or broken. */
export function usedBike(owner: string, issues: { slot: ComponentSlot; condition: number }[], baseline = 75): Bike {
  const bike: Bike = { owner, components: allSlots((slot) => ({ slot, installed: true, condition: baseline })) };
  for (const i of issues) bike.components[i.slot].condition = i.condition;
  return bike;
}

/** Record work on a slot: installing sets its condition to the work quality; repairs never make it worse. */
export function workOn(bike: Bike, slot: ComponentSlot, quality: number, mode: 'install' | 'repair'): void {
  const c = bike.components[slot];
  c.condition = mode === 'install' || !c.installed ? quality : Math.max(c.condition, quality);
  c.installed = true;
}

export const isComplete = (bike: Bike) => COMPONENT_SLOTS.every((s) => bike.components[s].installed);

export function averageCondition(bike: Bike, slots: readonly ComponentSlot[] = COMPONENT_SLOTS): number {
  return slots.reduce((sum, s) => sum + bike.components[s].condition, 0) / slots.length;
}
