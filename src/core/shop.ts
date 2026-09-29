import customersData from '../data/customers.json';
import { BALANCE } from './balance';
import type { GameState, WorkStationId } from './gameState';
import {
  completeTask,
  createJob,
  isJobDone,
  JOB_TEMPLATES,
  jobTemplate,
  nextTaskAt,
  scoreJob,
  type Job,
  type JobOutcome,
  type JobTask,
  type JobTemplate,
} from './jobs';
import { createMinigame, type Minigame } from './minigames';
import { createRng, pick, weightedPick, type Rng } from './rng';

export interface Customer {
  id: number;
  name: string;
  template: JobTemplate;
  request: string;
  /** Minute of the day they walk in. */
  arrivesAt: number;
  big: boolean;
  /** How the player agreed to take a big order (set once its decision has run). */
  plan?: { rush: boolean; overtime: boolean };
}

/** Gameplay moments that can trigger a decision. */
export type Trigger = 'end_of_day' | 'big_customer' | 'supplier_offer';

export type CounterAction =
  | { kind: 'handover'; job: Job }
  | { kind: 'offer'; customer: Customer }
  | { kind: 'busy'; job: Job }
  | { kind: 'empty' };

export interface HandoverResult extends JobOutcome {
  customer: string;
  jobName: string;
  reaction: string;
}

export interface DaySummary {
  day: number;
  jobsDone: number;
  revenue: number;
  rent: number;
  wages: number;
  staffIncome: number;
  unserved: number;
  reputationChange: number;
  cashChange: number;
}

const C = BALANCE.clock;

export class ShopController {
  /** Minute of the day (540 = 9:00). */
  minute = C.dayStartMinute;
  /** Open-hours minutes worked across all days; job timing uses this so nights don't count. */
  worked = 0;
  customers: Customer[] = [];
  activeJob: Job | null = null;
  private nextId = 1;
  private rng: Rng = createRng(1);
  private day = { jobsDone: 0, revenue: 0, startCash: 0, startRep: 0 };

  constructor(
    readonly state: GameState,
    private seed = 1,
  ) {}

  get dayEnd(): number {
    return C.dayEndMinute;
  }

  get closed(): boolean {
    return this.minute >= C.dayEndMinute;
  }

  get clockText(): string {
    const m = Math.min(this.minute, 24 * 60 - 1);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  }

  /** Customers who have walked in and are waiting at the counter. */
  get waiting(): Customer[] {
    return this.customers.filter((c) => c.arrivesAt <= this.minute);
  }

  /** Open the shop for the current day. Returns any triggers for decision events. */
  startDay(): Trigger[] {
    const s = this.state;
    const cfg = BALANCE.customers;
    this.rng = createRng(this.seed * 7919 + s.day);
    this.minute = C.dayStartMinute;
    this.day = { jobsDone: 0, revenue: 0, startCash: s.cash, startRep: s.reputation };

    const count = Math.min(
      cfg.maxPerDay,
      cfg.basePerDay + Math.floor(s.reputation / cfg.reputationPerExtraCustomer) + s.modifier('extraCustomersPerDay'),
    );
    const lastArrival = C.dayEndMinute - cfg.lastArrivalBeforeCloseMinutes;
    const walkIns = JOB_TEMPLATES.filter((t) => !t.big && t.weight > 0);
    const fresh: Customer[] = [];
    for (let i = 0; i < count; i++) {
      const template = weightedPick(this.rng, walkIns, (t) => t.weight);
      const arrivesAt = i === 0 ? C.dayStartMinute : Math.round(C.dayStartMinute + this.rng() * (lastArrival - C.dayStartMinute));
      fresh.push(this.makeCustomer(template, arrivesAt, false));
    }
    const bigDay = s.day === cfg.bigCustomerFirstDay || (s.day > cfg.bigCustomerFirstDay && this.rng() < cfg.bigCustomerChance);
    if (bigDay) {
      const big = JOB_TEMPLATES.find((t) => t.big)!;
      fresh.push(this.makeCustomer(big, Math.round(C.dayStartMinute + (lastArrival - C.dayStartMinute) * 0.25), true));
    }
    // Anyone still waiting from yesterday is first in line.
    this.customers = [...this.customers.map((c) => ({ ...c, arrivesAt: C.dayStartMinute })), ...fresh.sort((a, b) => a.arrivesAt - b.arrivesAt)];

    const triggers: Trigger[] = [];
    if (s.day >= BALANCE.events.supplierFirstDay && (s.day - BALANCE.events.supplierFirstDay) % BALANCE.events.supplierEveryDays === 0) {
      triggers.push('supplier_offer');
    }
    return triggers;
  }

  private makeCustomer(template: JobTemplate, arrivesAt: number, big: boolean): Customer {
    const names = big ? customersData.bigCustomerNames : customersData.names;
    const requests = (customersData.requests as Record<string, string[]>)[template.id] ?? ['Can you help?'];
    return { id: this.nextId++, name: pick(this.rng, names), template, request: pick(this.rng, requests), arrivesAt, big };
  }

  /** Advance the shop clock (only during open hours). */
  advance(minutes: number): void {
    if (this.closed || minutes <= 0) return;
    const step = Math.min(minutes, C.dayEndMinute - this.minute);
    this.minute += step;
    this.worked += step;
  }

  counter(): CounterAction {
    if (this.activeJob && isJobDone(this.activeJob)) return { kind: 'handover', job: this.activeJob };
    if (this.activeJob) return { kind: 'busy', job: this.activeJob };
    const next = this.waiting[0];
    return next ? { kind: 'offer', customer: next } : { kind: 'empty' };
  }

  accept(customer: Customer, rush = false, overtime = false): Job {
    if (this.activeJob) throw new Error('Already working on a job');
    this.customers = this.customers.filter((c) => c.id !== customer.id);
    this.activeJob = createJob(customer.id, customer.template, customer.name, this.worked, rush, overtime);
    return this.activeJob;
  }

  decline(customer: Customer): void {
    this.customers = this.customers.filter((c) => c.id !== customer.id);
    this.state.adjust('reputation', -BALANCE.economy.declineReputationPenalty);
  }

  taskAt(station: WorkStationId): JobTask | undefined {
    return this.activeJob ? nextTaskAt(this.activeJob, station) : undefined;
  }

  startTask(task: JobTask): Minigame {
    return createMinigame(task.def, this.state.skill(task.def.station), this.rng);
  }

  /** Record a finished minigame. Uses parts; if the wall is empty, parts are rush-ordered. */
  finishTask(task: JobTask, quality: number): { rushOrdered: boolean; minutes: number } {
    if (!this.activeJob) throw new Error('No active job');
    const e = BALANCE.economy;
    let minutes = task.def.minutes;
    let rushOrdered = false;
    if (this.state.inventoryHealth >= task.def.partsUse) {
      this.state.adjust('inventoryHealth', -task.def.partsUse);
    } else {
      rushOrdered = true;
      minutes += e.rushOrderMinutes;
      this.state.addCash(-Math.round(e.rushOrderPartsCost * this.state.modifier('partsCostMultiplier')));
    }
    completeTask(this.activeJob, task, quality);
    this.advance(minutes);
    return { rushOrdered, minutes };
  }

  /** Give the finished bike back: pay, reputation, morale. */
  handOver(): HandoverResult {
    const job = this.activeJob;
    if (!job || !isJobDone(job)) throw new Error('Job not finished');
    const s = this.state;
    const outcome = scoreJob(job, this.worked, {
      priceMultiplier: s.modifier('priceMultiplier'),
      partsQualityBonus: s.modifier('partsQualityBonus'),
      skillFor: (st) => s.skill(st),
    });
    s.addCash(outcome.payment);
    s.adjust('reputation', outcome.reputationDelta);
    if (outcome.rating === 'great') s.adjust('staffMorale', BALANCE.scoring.moraleFromGreatJob);
    if (outcome.rating === 'bad' && s.hasFlag('warranty_generous')) {
      // Generous warranty: redo costs money but protects reputation.
      s.addCash(-BALANCE.events.warrantyRedoCost);
      s.adjust('reputation', BALANCE.events.warrantyReputationSaved);
    }
    this.day.jobsDone++;
    this.day.revenue += outcome.payment;
    this.activeJob = null;
    const reaction = pick(this.rng, customersData.reactions[outcome.rating]);
    return { ...outcome, customer: job.customer, jobName: job.template.name, reaction };
  }

  restockCost(): number {
    return Math.round(BALANCE.economy.restockCost * this.state.modifier('partsCostMultiplier'));
  }

  restock(): boolean {
    const cost = this.restockCost();
    if (this.state.cash < cost || this.state.inventoryHealth >= BALANCE.limits.statMax) return false;
    this.state.addCash(-cost);
    this.state.adjust('inventoryHealth', BALANCE.economy.restockAmount);
    return true;
  }

  /** Close up: pay costs, count unserved customers. Does not advance the day (see nextDay). */
  endDay(): DaySummary {
    const s = this.state;
    const e = BALANCE.economy;
    const staff = s.modifier('staffCount');
    const rent = e.rentPerDay;
    const wages = Math.round(staff * e.wagePerStaffPerDay);
    const moraleFactor = 0.5 + s.staffMorale / 100;
    const staffIncome = Math.round(staff * e.staffJobsPerDay * e.staffEarningsPerJob * moraleFactor);
    s.addCash(staffIncome - rent - wages);

    const unserved = this.waiting.length;
    if (unserved) s.adjust('reputation', -unserved * e.unservedReputationPenalty);
    // Customers who never got served go elsewhere; those not yet arrived come back tomorrow.
    this.customers = this.customers.filter((c) => c.arrivesAt > this.minute);
    s.adjust('inventoryHealth', -e.inventoryDecayPerDay);

    this.minute = C.dayEndMinute;
    return {
      day: s.day,
      jobsDone: this.day.jobsDone,
      revenue: this.day.revenue,
      rent,
      wages,
      staffIncome,
      unserved,
      reputationChange: s.reputation - this.day.startRep,
      cashChange: s.cash - this.day.startCash,
    };
  }

  nextDay(): Trigger[] {
    this.state.nextDay();
    return this.startDay();
  }

  /** Test helper: a specific customer for a given job template. */
  walkIn(templateId: string, big = false): Customer {
    const c = this.makeCustomer(jobTemplate(templateId), this.minute, big);
    this.customers.unshift(c);
    return c;
  }
}
