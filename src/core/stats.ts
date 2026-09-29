import raw from '../data/stats.json';

export interface Stat {
  id: string;
  label: string;
  /** Up to 17 characters, for the ledger list. */
  short: string;
  value: number;
  unit: string;
  year: number;
  source_id: string;
  confidence: 'sourced' | 'estimate';
  note?: string;
}

export const STATS: Stat[] = raw.stats as Stat[];

export function stat(id: string): Stat {
  const s = STATS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown stat ${id}`);
  return s;
}

/** "7.0 billion USD", "$25", "19.4%" ... for text boxes. */
export function formatStat(s: Stat): string {
  const v = s.value.toLocaleString('en-US');
  if (s.unit.startsWith('billion USD')) return `$${s.value.toFixed(1)}B`;
  if (s.unit === 'USD') return `$${v}`;
  if (s.unit === '%') return `${v}%`;
  if (s.unit.startsWith('USD ')) return `$${v} ${s.unit.slice(4)}`;
  if (s.unit.startsWith('% ')) return `${v}% ${s.unit.slice(2)}`;
  return `${v} ${s.unit}`;
}

/** At most 7 characters: "$7.0B", "20%", "$3,055", "8.7M", "35.3K". */
export function compactStat(s: Stat): string {
  const n = s.value;
  const money = s.unit.startsWith('USD');
  if (s.unit.startsWith('billion USD')) return `$${n.toFixed(1)}B`;
  if (s.unit.startsWith('%')) return `${n}%`;
  if (s.unit.startsWith('million')) return `${n}M`;
  const body = n >= 100000 ? `${Math.round(n / 1000)}K` : n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('en-US');
  return money ? `$${body}` : body;
}

/** Source ids declared as "## <id>" headings in sources.md. */
export function sourceIdsFromMarkdown(md: string): string[] {
  return [...md.matchAll(/^## ([a-z0-9_]+)\s*$/gm)].map((m) => m[1]);
}

/** Parse a balance label: "stat: id", "derived: a,b", or "estimate: why". */
export function parseSourceLabel(label: string): { kind: 'stat' | 'derived' | 'estimate'; ids: string[]; why?: string } | null {
  const m = /^(stat|derived|estimate): (.+)$/.exec(label);
  if (!m) return null;
  const kind = m[1] as 'stat' | 'derived' | 'estimate';
  if (kind === 'estimate') return { kind, ids: [], why: m[2] };
  return { kind, ids: m[2].split(',').map((s) => s.trim()) };
}

export interface SourceEntry {
  id: string;
  title: string;
  publisher: string;
  year: string;
  url: string;
}

/** Parse the "## id" blocks of sources.md into entries. */
export function parseSources(md: string): Record<string, SourceEntry> {
  const out: Record<string, SourceEntry> = {};
  for (const block of md.split(/^## /m).slice(1)) {
    const id = block.split('\n')[0].trim();
    const field = (name: string) => new RegExp(`\\*\\*${name}:\\*\\* (.+)`).exec(block)?.[1].trim() ?? '';
    out[id] = {
      id,
      title: field('Title') || 'Estimate (no published source)',
      publisher: field('Publisher') || 'Game estimate',
      year: field('Year'),
      url: field('URL'),
    };
  }
  return out;
}
