import bankRaw from '../data/examQuestions.json';
import raw from '../data/training.json';
import { unwrap } from './balance';
import type { Effect, GameState, WorkStationId } from './gameState';
import type { Rng } from './rng';

export interface TrainingProgram {
  id: string;
  name: string;
  station: string;
  kind: 'skill' | 'exam' | 'workshop';
  blurb: string;
  skill?: WorkStationId;
  cost: number;
  costPerLevel: number;
  days: number;
  questions?: number;
  passScore?: number;
  effects?: Effect[];
  sets_flags?: string[];
}

export interface ExamQuestion {
  id: string;
  topic: string;
  question: string;
  choices: string[];
  answer: number;
}

export const PROGRAMS: TrainingProgram[] = unwrap(raw).programs as TrainingProgram[];
export const QUESTION_BANK: ExamQuestion[] = bankRaw.questions;
export const program = (id: string) => {
  const p = PROGRAMS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown training program ${id}`);
  return p;
};

export const CERT_FLAG = 'certified_mechanic';
export const EXAM_FAILED_FLAG = 'exam_failed';

/** Cost to enroll now. Skill courses get pricier at higher levels. */
export function trainingCost(p: TrainingProgram, state: GameState): number {
  const level = p.skill ? state.skill(p.skill) : 1;
  return p.cost + p.costPerLevel * (level - 1);
}

/** Why a program can't be taken right now, or null if it can. */
export function trainingBlocker(p: TrainingProgram, state: GameState, skillMax = 5): string | null {
  if (p.kind === 'skill' && p.skill && state.skill(p.skill) >= skillMax) return 'You have mastered this. Nothing more to learn here.';
  if (p.kind === 'exam' && state.hasFlag(CERT_FLAG)) return 'You are already certified.';
  if (p.kind === 'workshop' && (p.sets_flags ?? []).every((f) => state.hasFlag(f))) return 'You already took this workshop.';
  if (state.cash < trainingCost(p, state)) return `You need $${trainingCost(p, state)} to enroll.`;
  return null;
}

/** Pay and apply a skill course or workshop. (Exams are graded with gradeExam.) */
export function completeTraining(p: TrainingProgram, state: GameState): void {
  state.addCash(-trainingCost(p, state));
  if (p.kind === 'skill' && p.skill) state.applyEffect({ var: 'skill', station: p.skill, delta: 1 });
  state.applyEffects(p.effects);
  for (const f of p.sets_flags ?? []) state.setFlag(f);
  state.markTraining(p.id);
}

/** Draw `n` distinct questions and shuffle each one's answers. */
export function drawExam(rng: Rng, n: number, bank: ExamQuestion[] = QUESTION_BANK): ExamQuestion[] {
  const pool = [...bank];
  const out: ExamQuestion[] = [];
  while (out.length < n && pool.length) {
    const q = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const order = q.choices.map((_, i) => i).sort(() => rng() - 0.5);
    out.push({ ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) });
  }
  return out;
}

export interface ExamResult {
  score: number;
  total: number;
  passed: boolean;
}

/** Grade answers, charge the fee, and set the certification / failure flags. */
export function gradeExam(p: TrainingProgram, state: GameState, questions: ExamQuestion[], answers: number[]): ExamResult {
  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  const passed = score >= (p.passScore ?? questions.length);
  state.addCash(-trainingCost(p, state));
  if (passed) {
    state.setFlag(CERT_FLAG);
    state.clearFlag(EXAM_FAILED_FLAG);
  } else {
    state.setFlag(EXAM_FAILED_FLAG);
  }
  state.markTraining(p.id);
  return { score, total: questions.length, passed };
}
