import raw from '../data/balance.json';

/** A balance number plus where it came from ("placeholder" until backed by a real source). */
export interface Sourced<V = number> {
  value: V;
  source: string;
}

/** Replace every { value, source } wrapper with its bare value. */
export type Unwrapped<T> = T extends { value: infer V; source: string }
  ? V
  : T extends readonly unknown[]
    ? { [K in keyof T]: Unwrapped<T[K]> }
    : T extends object
      ? { [K in keyof T]: Unwrapped<T[K]> }
      : T;

export function isSourced(x: unknown): x is Sourced<unknown> {
  return (
    typeof x === 'object' &&
    x !== null &&
    !Array.isArray(x) &&
    'value' in x &&
    'source' in x &&
    typeof (x as Sourced).source === 'string'
  );
}

export function unwrap<T>(data: T): Unwrapped<T> {
  if (isSourced(data)) return data.value as Unwrapped<T>;
  if (Array.isArray(data)) return data.map((d) => unwrap(d)) as Unwrapped<T>;
  if (typeof data === 'object' && data !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) out[k] = unwrap(v);
    return out as Unwrapped<T>;
  }
  return data as Unwrapped<T>;
}

/**
 * Walk a JSON tree and return the paths of numbers that are NOT inside a
 * { value, source } wrapper. Used by tests to enforce the placeholder rule.
 */
export function findUnlabelledNumbers(data: unknown, path = '$', allow: (path: string) => boolean = () => false): string[] {
  if (isSourced(data)) return [];
  if (typeof data === 'number') return allow(path) ? [] : [path];
  if (Array.isArray(data)) return data.flatMap((d, i) => findUnlabelledNumbers(d, `${path}[${i}]`, allow));
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).flatMap(([k, v]) => findUnlabelledNumbers(v, `${path}.${k}`, allow));
  }
  return [];
}

export const BALANCE = unwrap(raw);
export type Balance = typeof BALANCE;
