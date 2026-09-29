/** Fill {placeholders} in a dialogue string. Unknown keys are left as-is. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** "+3" / "-2" / "0" for stat changes. */
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** "+$40" / "-$120" for cash changes. */
export const signedMoney = (n: number) => (n < 0 ? `-$${-n}` : `+$${n}`);
