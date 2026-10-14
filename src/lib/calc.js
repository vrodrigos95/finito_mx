import { addDays, addMonths, dateForDay, diffDays, fromISO, lastDayOfMonth, monthKey, today, weekEnd, weekStart } from './date.js';
import { sum } from './money.js';
import { DEFAULT_SOURCES } from '../data/seed.js';

// ---------- Pagos programados ----------

function rawInstances(s, until) {
  const out = [];
  if (s.type === 'list') {
    s.items.forEach((it, i) => { if (!s.end || it.date <= s.end) out.push({ origDate: it.date, amount: it.amount, idx: i }); });
  } else if (s.type === 'every') {
    // Cada N días (semanal = 7, catorcenal = 14)
    for (let i = 0; i < 2000; i++) {
      const d = addDays(s.start, i * s.days);
      if ((s.count && i >= s.count) || (s.end && d > s.end) || d > until) break;
      out.push({ origDate: d, amount: s.amount, idx: i });
    }
  } else if (s.type === 'monthly') {
    const st = fromISO(s.start);
    let y = st.getFullYear();
    let m = st.getMonth();
    let count = 0;
    for (;;) {
      const d = dateForDay(y, m, s.day);
      if (s.count && count >= s.count) break;
      if (s.end && d > s.end) break;
      if (d > until) break;
      if (d >= s.start) {
        out.push({ origDate: d, amount: s.amount, idx: count });
        count++;
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  } else if (s.type === 'semimonthly') {
    const st = fromISO(s.start);
    let y = st.getFullYear();
    let m = st.getMonth();
    let idx = 0;
    for (let guard = 0; guard < 400; guard++) {
      for (const day of [15, lastDayOfMonth(y, m)]) {
        const d = dateForDay(y, m, day);
        if (d < s.start) continue;
        if ((s.end && d > s.end) || d > until || (s.count && idx >= s.count)) return out;
        out.push({ origDate: d, amount: s.amount, idx: idx++ });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }
  return out;
}

// ---------- Prioridad de los pagos ----------
// alta = no se puede dejar de pagar · media = importante · baja = se puede pausar si no alcanza

export const PRIORITIES = [
  ['alta', 'Alta', 'No se puede dejar de pagar', 'var(--coral)'],
  ['media', 'Media', 'Importante, pero hay margen', 'var(--violet)'],
  ['baja', 'Baja', 'Se puede pausar si no alcanza', 'var(--cyan)'],
];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map(([k, l]) => [k, l]));
export const PRIORITY_COLOR = Object.fromEntries(PRIORITIES.map(([k, , , c]) => [k, c]));

export function priorityOf(s, state) {
  if (s.priority) return s.priority;
  if (s.kind === 'tanda') return 'alta';
  if (s.kind === 'deuda') {
    const d = state.debts.find((x) => x.id === s.debtId);
    if (!d) return 'media';
    return d.priority <= 1 ? 'alta' : d.priority === 2 ? 'media' : 'baja';
  }
  return 'media';
}

export function expandPayments(state, until = addDays(today(), 400)) {
  const res = [];
  for (const s of state.schedules) {
    for (const r of rawInstances(s, until)) {
      const key = `${s.id}@${r.origDate}#${r.idx}`;
      const ov = state.overrides[key] || {};
      if (ov.deleted) continue;
      res.push({
        key,
        scheduleId: s.id,
        debtId: s.debtId || null,
        name: s.name,
        kind: s.kind,
        note: ov.note ?? s.note ?? '',
        origDate: r.origDate,
        date: ov.date || r.origDate,
        amount: ov.amount ?? r.amount,
        priority: priorityOf(s, state),
        paid: !!ov.paid,
        paidAt: ov.paidAt || null,
      });
    }
  }
  res.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
  return res;
}

// ---------- Presupuesto semanal ----------

export const NON_PERSONAL = new Set(['Gasolina', 'Carro', 'Servicios']);

export function weekSpend(state, iso = today()) {
  const ws = weekStart(iso);
  const we = weekEnd(iso);
  const items = state.expenses.filter((e) => e.date >= ws && e.date <= we);
  const gas = sum(items.filter((e) => e.category === 'Gasolina'), (e) => e.amount);
  const personal = sum(items.filter((e) => !NON_PERSONAL.has(e.category)), (e) => e.amount);
  const { budgetGas, budgetPersonal } = state.settings;
  const budget = budgetGas + budgetPersonal;
  const spent = gas + personal;
  const daysLeft = diffDays(iso, we) + 1; // incluye hoy
  return { ws, we, gas, personal, spent, budget, budgetGas, budgetPersonal, left: budget - spent, daysLeft, items };
}

// ---------- Cuánto separar ----------

export const PERIOD_DAYS = { dia: 1, semana: 7, mes: 30.4 };

export function separation(state, payments, period = 'semana', ref = today()) {
  const horizon = addDays(ref, 30);
  const pending = payments.filter((p) => !p.paid && p.date <= horizon);
  const overdue = pending.filter((p) => p.date < ref);
  const upcoming = pending.filter((p) => p.date >= ref);
  const total = sum(pending, (p) => p.amount);
  const perDay = total / 30;
  const envWeekly = sum(state.envelopes, (e) => e.weekly || 0) + savingsWeekly(state);
  const days = PERIOD_DAYS[period];
  const byPriority = Object.fromEntries(PRIORITIES.map(([k]) => [k, (sum(pending.filter((p) => p.priority === k), (p) => p.amount) / 30) * days]));
  return {
    amount: perDay * days,
    byPriority,
    envelopes: (envWeekly / 7) * days,
    total,
    count: pending.length,
    overdue,
    upcoming,
    overdueTotal: sum(overdue, (p) => p.amount),
  };
}

// Semana a semana: cuánto separar según la prioridad de cada pago, más tus gastos del día a día y tus ahorros
export function weeklyPlan(state, payments, ref = today(), weeksAhead = 4) {
  const ws0 = weekStart(ref);
  const weeks = Array.from({ length: weeksAhead }, (_, i) => {
    const ws = addDays(ws0, 7 * i);
    const we = addDays(ws, 6);
    const items = payments.filter((p) => !p.paid && p.date >= (i === 0 ? ref : ws) && p.date <= we);
    const by = Object.fromEntries(PRIORITIES.map(([k]) => [k, sum(items.filter((p) => p.priority === k), (p) => p.amount)]));
    return { ws, we, items, by, total: sum(items, (p) => p.amount) };
  });
  const overdue = payments.filter((p) => !p.paid && p.date < ref);
  const overdueBy = Object.fromEntries(PRIORITIES.map(([k]) => [k, sum(overdue.filter((p) => p.priority === k), (p) => p.amount)]));
  // Promedio semanal de pagos; lo atrasado se reparte en las mismas semanas
  const avg = Object.fromEntries(PRIORITIES.map(([k]) => [k, (sum(weeks, (w) => w.by[k]) + overdueBy[k]) / weeksAhead]));
  const day2day = (state.settings.budgetGas || 0) + (state.settings.budgetPersonal || 0);
  const saving = sum(state.envelopes, (e) => e.weekly || 0) + savingsWeekly(state);
  const levels = {
    minimo: avg.alta + day2day,
    recomendado: avg.alta + avg.media + day2day + saving,
    completo: avg.alta + avg.media + avg.baja + day2day + saving,
  };
  return { weeks, overdue, overdueBy, avg, day2day, saving, levels };
}

// Promedio de ingreso semanal de las últimas semanas cerradas que tienen registros
export function avgWeeklyIncome(state, n = 8, ref = today()) {
  const ws0 = weekStart(ref);
  const ws = Array.from({ length: n }, (_, i) => weekIncome(state, addDays(ws0, -7 * (i + 1)))).filter((w) => w.total > 0);
  return ws.length ? sum(ws, (w) => w.total) / ws.length : 0;
}

// ---------- Ahorros ----------

export const savingsWeekly = (state) => sum((state.savings || []).filter((g) => !g.goal || g.saved < g.goal), (g) => g.weekly || 0);

// Ritmo real: lo aportado (neto) en las últimas 8 semanas entre las semanas transcurridas
export function savingRhythm(goal, ref = today()) {
  const from = addDays(ref, -56);
  const moves = (goal.history || []).filter((h) => !h.initial && h.date > from && h.date <= ref);
  if (!moves.length) return 0;
  const first = moves.reduce((m, h) => (h.date < m ? h.date : m), ref);
  const weeks = Math.min(8, Math.max(1, Math.ceil((diffDays(first, ref) + 1) / 7)));
  return Math.max(0, sum(moves, (h) => h.amount) / weeks);
}

// Cuánto tardas en llegar a la meta con un ritmo semanal dado
export function savingProjection(goal, weekly, ref = today()) {
  const left = Math.max(0, (goal.goal || 0) - (goal.saved || 0));
  if (!left) return { left: 0, weeks: 0, date: ref, done: true };
  if (!weekly || weekly <= 0) return { left, weeks: null, date: null, done: false };
  const weeks = Math.ceil(left / weekly);
  return { left, weeks, date: addDays(ref, weeks * 7), done: false };
}

// Para llegar en la fecha objetivo, cuánto hace falta por semana
export function savingNeeded(goal, ref = today()) {
  if (!goal.target) return null;
  const left = Math.max(0, (goal.goal || 0) - (goal.saved || 0));
  const weeks = Math.max(1, Math.ceil(diffDays(ref, goal.target) / 7));
  return { weeks, perWeek: left / weeks, past: goal.target < ref };
}

// ---------- Deudas ----------

// Cada cuánto se paga una deuda
export const FREQS = [
  ['semanal', 'Cada semana', 52 / 12],
  ['catorcenal', 'Cada 14 días', 26 / 12],
  ['quincenal', 'Cada quincena (15 y fin de mes)', 2],
  ['mensual', 'Cada mes', 1],
];
export const FREQ_LABEL = Object.fromEntries(FREQS.map(([k, l]) => [k, l]));
export const freqMonthly = (plan) => (plan ? plan.amount * (FREQS.find(([k]) => k === plan.type)?.[2] || 1) : 0);

export function planSchedule(debt, plan) {
  const base = { debtId: debt.id, name: debt.name, kind: 'deuda', amount: plan.amount, start: plan.start, count: plan.count || undefined, fromPlan: true };
  if (plan.type === 'semanal') return { ...base, type: 'every', days: 7 };
  if (plan.type === 'catorcenal') return { ...base, type: 'every', days: 14 };
  if (plan.type === 'quincenal') return { ...base, type: 'semimonthly' };
  return { ...base, type: 'monthly', day: Number(plan.start.slice(8)) };
}

// Fecha del último pago de un plan (para mostrarla antes de guardar)
export function planLastDate(plan) {
  if (!plan?.count || !plan.amount || !plan.start) return null;
  const s = planSchedule({ id: 'x', name: 'x' }, plan);
  const all = rawInstances(s, addDays(plan.start, 365 * 30));
  return all.at(-1)?.origDate || null;
}

export function debtTotals(state) {
  const start = sum(state.debts, (d) => d.startBalance || 0);
  const now = sum(state.debts, (d) => Math.max(0, d.balance));
  return { start, now, paid: start - now, pct: start ? (start - now) / start : 0 };
}

// Proyección mes a mes. Antes de snowballStart: solo pagos programados.
// Desde snowballStart: presupuesto mensual, mínimos primero y lo extra a la deuda más chica (bola de nieve).
export function projectDebts(state, payments, { extra = null } = {}) {
  const startYm = monthKey(today());
  const snowYm = state.settings.snowballStart;
  const B = state.settings.debtBudgetMonthly;
  const debts = state.debts
    .filter((d) => d.balance > 1.5)
    .map((d) => ({ ...d, bal: d.balance - (extra && extra.id === d.id ? extra.amount : 0), interest: 0 }));
  const sched = {};
  for (const p of payments) {
    if (p.paid || !p.debtId) continue;
    const ym = p.date < today() ? startYm : monthKey(p.date);
    sched[p.debtId] ??= {};
    sched[p.debtId][ym] = (sched[p.debtId][ym] || 0) + p.amount;
  }
  const lastSchedYm = {};
  for (const [id, byM] of Object.entries(sched)) lastSchedYm[id] = Object.keys(byM).sort().at(-1);

  const payoff = {};
  const series = [];
  for (const d of debts) if (d.bal <= 1.5) payoff[d.id] = startYm;
  let ym = startYm;
  for (let i = 0; i < 180; i++) {
    const alive = debts.filter((d) => d.bal > 1.5);
    series.push({ ym, total: sum(alive, (d) => d.bal) });
    if (!alive.length) break;
    const snow = ym >= snowYm;
    if (snow) {
      for (const d of alive) {
        if (d.rate) {
          const it = d.bal * (d.rate / 100 / 12);
          d.bal += it;
          d.interest += it;
        }
      }
    }
    let pool = snow ? B : Infinity;
    const minFor = (d) => {
      const s = sched[d.id]?.[ym];
      if (s) return s;
      if (!snow) return 0;
      if (d.status === 'pausa') return d.monthly;
      return lastSchedYm[d.id] && lastSchedYm[d.id] >= ym ? 0 : d.monthly;
    };
    const order = [...alive].sort((a, b) => a.priority - b.priority || a.bal - b.bal);
    for (const d of order) {
      const pay = Math.min(d.bal, minFor(d), pool);
      d.bal -= pay;
      pool -= pay;
    }
    if (snow && pool > 0) {
      const bySize = debts.filter((d) => d.bal > 1.5).sort((a, b) => a.bal - b.bal);
      for (const d of bySize) {
        if (pool <= 0) break;
        const pay = Math.min(d.bal, pool);
        d.bal -= pay;
        pool -= pay;
      }
    }
    for (const d of debts) if (d.bal <= 1.5 && !payoff[d.id]) payoff[d.id] = ym;
    ym = addMonths(ym, 1);
  }
  const allPaid = debts.every((d) => payoff[d.id]);
  const freedom = allPaid ? Object.values(payoff).sort().at(-1) : null;
  const interest = Object.fromEntries(debts.map((d) => [d.id, d.interest]));
  return { payoff, freedom, series, interest };
}

export function pendingCount(debt, payments) {
  const n = payments.filter((p) => p.debtId === debt.id && !p.paid).length;
  if ((debt.status === 'pausa' && !debt.plan) || n === 0) return debt.monthly ? Math.ceil(debt.balance / debt.monthly) : 0;
  return n;
}

// ---------- Ingresos ----------

const FALLBACK_COLORS = ['#C8F169', '#A89CFF', '#7FD4E6', '#FF8B78', '#F3C969', '#6B717C'];
export const sourceList = (state) => state.incomeSources || DEFAULT_SOURCES;
export const sourceColor = (state, name) => {
  const list = sourceList(state);
  const s = list.find((x) => x.name === name);
  return s ? s.color : '#3A3F4A';
};
export const nextSourceColor = (state) => {
  const used = new Set(sourceList(state).map((s) => s.color));
  return FALLBACK_COLORS.find((c) => !used.has(c)) || FALLBACK_COLORS[sourceList(state).length % FALLBACK_COLORS.length];
};

// Nombres a mostrar: los tipos activos más cualquier tipo viejo que tenga registros en el periodo
export function sourceNames(state, items = []) {
  const names = sourceList(state).map((s) => s.name);
  for (const i of items) if (!names.includes(i.source)) names.push(i.source);
  return names;
}

function incomeRange(state, from, to) {
  const items = state.incomes.filter((i) => i.date >= from && i.date <= to);
  const names = sourceNames(state, items);
  const bySource = Object.fromEntries(names.map((s) => [s, 0]));
  for (const i of items) bySource[i.source] = (bySource[i.source] || 0) + i.amount;
  return { items, names, bySource, total: sum(items, (i) => i.amount) };
}

export function weekIncome(state, ws) {
  const we = addDays(ws, 6);
  return { ws, we, ...incomeRange(state, ws, we) };
}

export function monthIncome(state, ym) {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const to = `${ym}-${String(lastDayOfMonth(y, m - 1)).padStart(2, '0')}`;
  return { ym, from, to, ...incomeRange(state, from, to) };
}

// Gastos del mes: fijos (programados) contra variables (registrados)
export function monthOutflows(state, payments, ym) {
  const inMonth = payments.filter((p) => monthKey(p.date) === ym);
  const fijos = inMonth.filter((p) => p.kind === 'fijo');
  const deudas = inMonth.filter((p) => p.kind === 'deuda');
  const tanda = inMonth.filter((p) => p.kind === 'tanda');
  const variables = state.expenses.filter((e) => monthKey(e.date) === ym);
  const byCat = {};
  for (const e of variables) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  return {
    fijos, deudas, tanda, variables,
    fijosTotal: sum(fijos, (p) => p.amount),
    deudasTotal: sum(deudas, (p) => p.amount),
    tandaTotal: sum(tanda, (p) => p.amount),
    variablesTotal: sum(variables, (e) => e.amount),
    byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
  };
}
