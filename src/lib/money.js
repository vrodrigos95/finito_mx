const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const money = (n) => `${n < 0 ? '−' : ''}$${nf.format(Math.abs(Math.round(n)))}`;
export const moneyExact = (n) => `$${nf2.format(n)}`;
export const moneyK = (n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : money(n));
export const pct = (x) => `${Math.round(x * 100)}%`;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
