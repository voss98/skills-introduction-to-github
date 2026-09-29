import raw from '../data/jobs.json';
import { BALANCE, unwrap } from './balance';
import { newBuildKit, usedBike, workOn, type Bike, type ComponentSlot } from './bike';
import type { WorkStationId } from './gameState';

export type MinigameKind = 'timing' | 'sequence' | 'torque';

export interface TaskDef {
  id: string;
  name: string;
  station: WorkStationId;
  slot: ComponentSlot;
  minigame: MinigameKind;
  hint: string;
  minutes: number;
  partsUse: number;
  difficulty: number;
  targetNm?: number;
}

export interface JobTemplate {
  id: string;
  kind: 'repair' | 'build';
  name: string;
  tasks: string[];
  price: number;
  weight: number;
  big?: boolean;
  issues?: { slot: ComponentSlot; condition: number }[];
}

const data = unwrap(raw);

export const TASKS: Record<string, TaskDef> = Object.fromEntries(
  Object.entries(data.tasks).map(([id, t]) => [id, { id, ...(t as Omit<TaskDef, 'id'>) }]),
);
export const JOB_TEMPLATES: JobTemplate[] = data.jobs as JobTemplate[];
export const jobTemplate = (id: string): JobTemplate => {
  const t = JOB_TEMPLATES.find((j) => j.id === id);
  if (!t) throw new Error(`Unknown job template ${id}`);
  return t;
};

export interface JobTask {
  def: TaskDef;
  done: boolean;
  quality: number | null;
}

export interface Job {
  id: number;
  template: JobTemplate;
  customer: string;
  bike: Bike;
  tasks: JobTask[];
  /** Shop-clock minute the job was accepted. */
  acceptedAt: number;
  rush: boolean;
}

export function createJob(id: number, template: JobTemplate, customer: string, acceptedAt: number, rush = false): Job {
  return {
    id,
    template,
    customer,
    bike: template.kind === 'build' ? newBuildKit(customer) : usedBike(customer, template.issues ?? []),
    tasks: template.tasks.map((t) => ({ def: TASKS[t], done: false, quality: null })),
    acceptedAt,
    rush,
  };
}

export const estimatedMinutes = (t: JobTemplate) =>
  t.tasks.reduce((s, id) => s + TASKS[id].minutes, 0) + BALANCE.scoring.walkAllowanceMinutes;

/** Minutes the customer is happy to wait before the time score starts dropping. */
export function deadlineMinutes(job: Job): number {
  const s = BALANCE.scoring;
  return Math.round(estimatedMinutes(job.template) * s.timeSlack * (job.rush ? s.rushDeadlineFactor : 1));
}

export const pendingTasks = (job: Job) => job.tasks.filter((t) => !t.done);
export const nextTaskAt = (job: Job, station: WorkStationId) => pendingTasks(job).find((t) => t.def.station === station);
export const isJobDone = (job: Job) => pendingTasks(job).length === 0;

export function completeTask(job: Job, task: JobTask, quality: number): void {
  task.done = true;
  task.quality = Math.round(Math.min(100, Math.max(0, quality)));
  workOn(job.bike, task.def.slot, task.quality, job.template.kind === 'build' ? 'install' : 'repair');
}

export interface ScoreContext {
  priceMultiplier: number;
  partsQualityBonus: number;
  skillFor: (station: WorkStationId) => number;
}

export type Rating = 'great' | 'ok' | 'bad';

export interface JobOutcome {
  quality: number;
  timeScore: number;
  satisfaction: number;
  payment: number;
  reputationDelta: number;
  rating: Rating;
  minutesTaken: number;
  deadline: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Turn finished work into customer satisfaction, payment and reputation. */
export function scoreJob(job: Job, finishedAt: number, ctx: ScoreContext): JobOutcome {
  const s = BALANCE.scoring;
  const qualities = job.tasks.map((t) => t.quality ?? 0);
  const quality = Math.round(clamp(qualities.reduce((a, b) => a + b, 0) / qualities.length + ctx.partsQualityBonus));
  const minutesTaken = Math.max(0, finishedAt - job.acceptedAt);
  const deadline = deadlineMinutes(job);
  const timeScore = minutesTaken <= deadline ? 100 : Math.round((100 * deadline) / minutesTaken);
  const satisfaction = Math.round(clamp(quality * s.qualityWeight + timeScore * s.timeWeight));

  const payFactor = s.payAtZeroSatisfaction + (s.payAtFullSatisfaction - s.payAtZeroSatisfaction) * (satisfaction / 100);
  const stations = [...new Set(job.tasks.map((t) => t.def.station))];
  const avgSkill = stations.reduce((a, st) => a + ctx.skillFor(st), 0) / stations.length;
  const skillReward = 1 + s.skillRewardPerLevel * (avgSkill - 1);
  const payment = Math.round(
    job.template.price * ctx.priceMultiplier * (job.rush ? s.rushPriceFactor : 1) * payFactor * skillReward,
  );
  const reputationDelta = Math.round((satisfaction - s.reputationPivot) / s.satisfactionPerReputationPoint);
  const rating: Rating = satisfaction >= s.greatJobSatisfaction ? 'great' : satisfaction >= s.reputationPivot ? 'ok' : 'bad';
  return { quality, timeScore, satisfaction, payment, reputationDelta, rating, minutesTaken, deadline };
}
