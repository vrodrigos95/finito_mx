// Fechas locales como 'YYYY-MM-DD'
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const today = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDays = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000); // b - a

export const lastDayOfMonth = (y, m) => new Date(y, m + 1, 0).getDate(); // m: 0-11
export const dateForDay = (y, m, day) => toISO(new Date(y, m, Math.min(day, lastDayOfMonth(y, m))));

// Semana lunes a domingo
export const weekStart = (iso) => {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
};
export const weekEnd = (iso) => addDays(weekStart(iso), 6);

export const monthKey = (iso) => iso.slice(0, 7);
export const addMonths = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtShort = (iso) => {
  const d = fromISO(iso);
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtDayMonth = (iso) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtLong = (iso) => {
  const d = fromISO(iso);
  return `${cap(DIAS_L[d.getDay()])} ${d.getDate()} de ${MESES_L[d.getMonth()]}`;
};
export const fmtMonthYear = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${cap(MESES[m - 1])} ${y}`;
};
export const fmtMonthLong = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${cap(MESES_L[m - 1])} ${y}`;
};
export const dowShort = (iso) => DIAS[fromISO(iso).getDay()].toUpperCase();
export const dayNum = (iso) => fromISO(iso).getDate();

export const relDays = (iso, ref = today()) => {
  const n = diffDays(ref, iso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n > 1) return `en ${n} días`;
  return `hace ${-n} días`;
};

// Quincena: 1 (1-15) o 2 (16-fin)
export const quincenaKey = (iso) => {
  const d = fromISO(iso);
  return `${monthKey(iso)}-${d.getDate() <= 15 ? 1 : 2}`;
};
export const quincenaLabel = (key) => {
  const [y, m, q] = key.split('-').map(Number);
  const last = lastDayOfMonth(y, m - 1);
  return q === 1 ? `1–15 ${MESES[m - 1]}` : `16–${last} ${MESES[m - 1]}`;
};
export const quincenaTitle = (key) => {
  const [, m, q] = key.split('-').map(Number);
  return `${q === 1 ? '1ª' : '2ª'} quincena de ${MESES_L[m - 1]}`;
};
