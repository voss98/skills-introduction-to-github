import { describe, expect, it } from 'vitest';
import { fmt, signed, signedMoney } from '../src/core/text';

describe('text helpers', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fmt('PAID ${payment} {x}', { payment: 30 })).toBe('PAID $30 {x}');
  });
  it('formats signed numbers and money', () => {
    expect(signed(3)).toBe('+3');
    expect(signed(-2)).toBe('-2');
    expect(signedMoney(-120)).toBe('-$120');
    expect(signedMoney(40)).toBe('+$40');
  });
});
