import { describe, expect, it } from 'vitest';
import balanceRaw from '../src/data/balance.json';
import { findUnlabelledNumbers, isSourced, unwrap } from '../src/core/balance';

/** Collect every { value, source } wrapper in a JSON tree. */
function sourced(data: unknown, out: { source: string }[] = []): { source: string }[] {
  if (isSourced(data)) out.push(data);
  else if (Array.isArray(data)) data.forEach((d) => sourced(d, out));
  else if (data && typeof data === 'object') Object.values(data).forEach((d) => sourced(d, out));
  return out;
}

describe('balance data', () => {
  it('labels every number with a source', () => {
    expect(findUnlabelledNumbers(balanceRaw)).toEqual([]);
  });

  it('every source is a stat, a derivation, or an explained estimate', () => {
    const all = sourced(balanceRaw);
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) expect(s.source).toMatch(/^(stat|derived|estimate): .+/);
  });

  it('unwraps nested values', () => {
    expect(unwrap({ a: { value: 3, source: 'placeholder' }, b: [{ value: 1, source: 'x' }] })).toEqual({ a: 3, b: [1] });
  });

  it('flags bare numbers', () => {
    expect(findUnlabelledNumbers({ a: 1, b: { value: 2, source: 'placeholder' }, c: [3] })).toEqual(['$.a', '$.c[0]']);
  });
});
