import { addDays, addMonths, dateForDay, diffDays, fromISO, lastDayOfMonth, monthKey, today, weekEnd, weekStart } from './date.js';
import { sum } from './money.js';

// ---------- Pagos programados ----------

function rawInstances(s, until) {
  const out = [];
  if (s.type === 'list') {
    s.items.forEach((it, i) => out.push({ origDate: it.date, amount: it.amount, idx: i }));
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
        if ((s.end && d > s.end) || d > until) return out;
        out.push({ origDate: d, amount: s.amount, idx: idx++ });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }
  return out;
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
  const envWeekly = sum(state.envelopes, (e) => e.weekly || 0);
  const days = PERIOD_DAYS[period];
  return {
    amount: perDay * days,
    envelopes: (envWeekly / 7) * days,
    total,
    count: pending.length,
    overdue,
    upcoming,
    overdueTotal: sum(overdue, (p) => p.amount),
  };
}

// ---------- Deudas ----------

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
    .filter((d) => d.balance > 0.5)
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
  for (const d of debts) if (d.bal <= 0.5) payoff[d.id] = startYm;
  let ym = startYm;
  for (let i = 0; i < 180; i++) {
    const alive = debts.filter((d) => d.bal > 0.5);
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
      const bySize = debts.filter((d) => d.bal > 0.5).sort((a, b) => a.bal - b.bal);
      for (const d of bySize) {
        if (pool <= 0) break;
        const pay = Math.min(d.bal, pool);
        d.bal -= pay;
        pool -= pay;
      }
    }
    for (const d of debts) if (d.bal <= 0.5 && !payoff[d.id]) payoff[d.id] = ym;
    ym = addMonths(ym, 1);
  }
  const allPaid = debts.every((d) => payoff[d.id]);
  const freedom = allPaid ? Object.values(payoff).sort().at(-1) : null;
  const interest = Object.fromEntries(debts.map((d) => [d.id, d.interest]));
  return { payoff, freedom, series, interest };
}

export function pendingCount(debt, payments) {
  const n = payments.filter((p) => p.debtId === debt.id && !p.paid).length;
  if (debt.status === 'pausa' || n === 0) return debt.monthly ? Math.ceil(debt.balance / debt.monthly) : 0;
  return n;
}

// ---------- Ingresos ----------

export const SOURCES = ['Uber', 'Didi', 'P5', 'Asesorías', 'Otro'];

export function weekIncome(state, ws) {
  const we = addDays(ws, 6);
  const items = state.incomes.filter((i) => i.date >= ws && i.date <= we);
  const bySource = Object.fromEntries(SOURCES.map((s) => [s, 0]));
  for (const i of items) bySource[i.source] = (bySource[i.source] || 0) + i.amount;
  return { ws, we, items, bySource, total: sum(items, (i) => i.amount) };
}
