import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DATA_VERSION, DEFAULT_SOURCES, DIDI_SCHEDULE, makeSeed } from '../data/seed.js';
import { NOTION_EXPENSES } from '../data/notion.js';
import { expandPayments } from './calc.js';
import { today } from './date.js';

const KEY = 'finito:v1';
const uid = () => Math.random().toString(36).slice(2, 10);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* sin almacenamiento */ }
  return makeSeed();
}

function adjustDebt(state, debtId, delta) {
  if (!debtId) return state.debts;
  return state.debts.map((d) => (d.id === debtId ? { ...d, balance: Math.max(0, Math.round((d.balance + delta) * 100) / 100) } : d));
}

// Actualiza datos ya guardados en el teléfono sin borrar lo registrado
function migrate(s) {
  const v = s.dataVersion || 1;
  if (v < 2) {
    s.incomeSources ??= DEFAULT_SOURCES.map((x) => ({ ...x }));
    if (!s.schedules.some((x) => x.id === 's-didi')) s.schedules = [...s.schedules, { ...DIDI_SCHEDULE, items: DIDI_SCHEDULE.items.map((i) => ({ ...i })) }];
    s.debts = s.debts.map((d) => (d.id === 'didi' ? { ...d, status: 'activa', priority: 2, note: 'Quincenal. Lo pagas aparte de tus ganancias. Último pago el 15 mar.' } : d));
    s.schedules = s.schedules.map((x) => (x.id === 's-atr-hey' ? { ...x, note: 'Pago atrasado', items: [{ date: '2026-09-15', amount: 3000 }] } : x));
  }
  if (v < 3) {
    // Recupera las notas de Notion («Starbucks», «Oxxo»…) para poder buscarlas
    const pool = NOTION_EXPENSES.map(([date, category, amount, note]) => ({ key: `${date}|${category}|${amount}`, note }));
    s.expenses = s.expenses.map((e) => {
      if (e.from !== 'notion' || e.note) return e;
      const i = pool.findIndex((x) => x.key === `${e.date}|${e.category}|${e.amount}`);
      if (i < 0) return e;
      const [hit] = pool.splice(i, 1);
      return { ...e, note: hit.note };
    });
  }
  s.dataVersion = DATA_VERSION;
  return s;
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
    case 'updateExpense': {
      const old = state.expenses.find((x) => x.id === a.id);
      if (!old) return state;
      const upd = { ...old, ...a.patch };
      let next = { ...state, expenses: state.expenses.map((x) => (x.id === a.id ? upd : x)) };
      if (old.category === 'Carro') next = carroEnvelope(next, old.amount);
      if (upd.category === 'Carro') next = carroEnvelope(next, -upd.amount);
      return next;
    }
    case 'updateIncome':
      return { ...state, incomes: state.incomes.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
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
    case 'addSource': {
      const list = state.incomeSources || DEFAULT_SOURCES;
      if (list.some((x) => x.name.toLowerCase() === a.source.name.toLowerCase())) return state;
      return {
        ...state,
        incomeSources: [...list, a.source],
        incomeTags: state.incomeTags.some((t) => t.name === a.source.name) ? state.incomeTags : [...state.incomeTags, { name: a.source.name, amount: 500 }],
      };
    }
    case 'removeSource':
      return {
        ...state,
        incomeSources: (state.incomeSources || DEFAULT_SOURCES).filter((x) => x.name !== a.name),
        incomeTags: state.incomeTags.filter((t) => t.name !== a.name),
      };
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
