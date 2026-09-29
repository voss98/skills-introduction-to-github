import raw from '../data/industryReports.json';
import { formatStat, stat } from './stats';
import { fmt } from './text';

export interface IndustryReport {
  id: string;
  month: number;
  stat_id: string;
  headline: string;
  body: string;
  event?: string;
}

export const REPORTS: IndustryReport[] = raw.reports;

export const reportForMonth = (month: number): IndustryReport => REPORTS[(month - 1) % REPORTS.length];

/** The news text with the real figure filled in, plus a source line. */
export function reportText(r: IndustryReport): { headline: string; body: string; source: string } {
  const s = stat(r.stat_id);
  return { headline: r.headline, body: fmt(r.body, { value: formatStat(s) }), source: `SOURCE: ${sourceLabel(s.source_id)} (${s.year})` };
}

/** Short publisher label for a source id, e.g. "PEOPLEFORBIKES". Filled from sources.md at runtime. */
let publisherById: Record<string, string> = {};
export function setPublishers(map: Record<string, string>): void {
  publisherById = map;
}
const sourceLabel = (id: string) => publisherById[id] ?? id;
