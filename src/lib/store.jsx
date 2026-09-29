import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { makeSeed } from '../data/seed.js';
import { expandPayments } from './calc.js';
import { today } from './date.js';

const KEY = 'finito:v1';
const uid = () => Math.random().toString(36).slice(2, 10);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* sin almacenamiento */ }
  return makeSeed();
}

function adjustDebt(state, debtId, delta) {
  if (!debtId) return state.debts;
  return state.debts.map((d) => (d.id === debtId ? { ...d, balance: Math.max(0, Math.round((d.balance + delta) * 100) / 100) } : d));
}

// Los gastos de «Carro» salen del sobre del carro
function carroEnvelope(state, delta) {
  return { ...state, envelopes: state.envelopes.map((e) => (e.id === 'carro' ? { ...e, saved: Math.max(0, e.saved + delta) } : e)) };
}

function reducer(state, a) {
  switch (a.type) {
    case 'replace':
      return a.state;
    case 'addExpense': {
      const next = { ...state, expenses: [...state.expenses, { id: uid(), ...a.item }] };
      return a.item.category === 'Carro' ? carroEnvelope(next, -a.item.amount) : next;
    }
    case 'addIncome':
      return { ...state, incomes: [...state.incomes, { id: uid(), ...a.item }] };
    case 'removeExpense': {
      const e = state.expenses.find((x) => x.id === a.id);
      const next = { ...state, expenses: state.expenses.filter((x) => x.id !== a.id) };
      return e && e.category === 'Carro' ? carroEnvelope(next, e.amount) : next;
    }
    case 'removeIncome':
      return { ...state, incomes: state.incomes.filter((e) => e.id !== a.id) };
    case 'setWeekSource': {
      // Reemplaza lo registrado de una fuente en la semana por un solo total
      const { ws, we, source, amount } = a;
      const keep = state.incomes.filter((i) => !(i.source === source && i.date >= ws && i.date <= we));
      const add = amount > 0 ? [{ id: uid(), date: we > today() ? today() : we, source, amount }] : [];
      return { ...state, incomes: [...keep, ...add] };
    }
    case 'setWeekMeta':
      return { ...state, weekMeta: { ...state.weekMeta, [a.ws]: { ...(state.weekMeta[a.ws] || {}), ...a.patch } } };
    case 'togglePaid': {
      const p = a.payment;
      const ov = state.overrides[p.key] || {};
      const paid = !ov.paid;
      return {
        ...state,
        overrides: { ...state.overrides, [p.key]: { ...ov, paid, paidAt: paid ? today() : null } },
        debts: adjustDebt(state, p.debtId, paid ? -p.amount : p.amount),
      };
    }
    case 'editPayment': {
      const ov = state.overrides[a.key] || {};
      return { ...state, overrides: { ...state.overrides, [a.key]: { ...ov, ...a.patch } } };
    }
    case 'addSchedule':
      return { ...state, schedules: [...state.schedules, { id: `s-${uid()}`, ...a.schedule }] };
    case 'removeSchedule':
      return { ...state, schedules: state.schedules.filter((s) => s.id !== a.id) };
    case 'abono':
      return {
        ...state,
        abonos: [...state.abonos, { id: uid(), debtId: a.debtId, amount: a.amount, date: today() }],
        debts: adjustDebt(state, a.debtId, -a.amount),
      };
    case 'updateDebt':
      return { ...state, debts: state.debts.map((d) => (d.id === a.id ? { ...d, ...a.patch } : d)) };
    case 'addDebt': {
      const id = uid();
      return { ...state, debts: [...state.debts, { id, rate: null, note: '', status: 'activa', priority: 3, ...a.debt, startBalance: a.debt.balance }] };
    }
    case 'removeDebt':
      return {
        ...state,
        debts: state.debts.filter((d) => d.id !== a.id),
        schedules: state.schedules.filter((s) => s.debtId !== a.id),
      };
    case 'envelopeAdd':
      return { ...state, envelopes: state.envelopes.map((e) => (e.id === a.id ? { ...e, saved: Math.max(0, e.saved + a.amount) } : e)) };
    case 'updateEnvelope':
      return { ...state, envelopes: state.envelopes.map((e) => (e.id === a.id ? { ...e, ...a.patch } : e)) };
    case 'addEnvelope':
      return { ...state, envelopes: [...state.envelopes, { id: uid(), saved: 0, weekly: 0, hint: '', ...a.envelope }] };
    case 'removeEnvelope':
      return { ...state, envelopes: state.envelopes.filter((e) => e.id !== a.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'addTag': {
      const k = a.kind === 'ingreso' ? 'incomeTags' : 'expenseTags';
      if (state[k].some((t) => t.name.toLowerCase() === a.tag.name.toLowerCase())) return state;
      return { ...state, [k]: [...state[k], a.tag] };
    }
    case 'updateTag': {
      const k = a.kind === 'ingreso' ? 'incomeTags' : 'expenseTags';
      return { ...state, [k]: state[k].map((t) => (t.name === a.name ? { ...t, ...a.patch } : t)) };
    }
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load);
  const [toast, setToast] = useState(null);
  const tRef = useRef();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* lleno o bloqueado */ }
  }, [state]);

  const payments = useMemo(() => expandPayments(state), [state.schedules, state.overrides]); // eslint-disable-line

  const notify = useCallback((msg, undo) => {
    clearTimeout(tRef.current);
    setToast({ msg, undo, id: Math.random() });
    tRef.current = setTimeout(() => setToast(null), undo ? 4500 : 2600);
  }, []);

  const value = useMemo(() => ({ state, dispatch, payments, toast, setToast, notify }), [state, payments, toast, notify]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function exportBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finito-respaldo-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function resetToSeed() {
  return makeSeed();
}
