// Datos iniciales de Rodrigo al 29 de septiembre de 2026.
// Deudas y fijos: notas del 27/09/2026. Calendarios de Mexdin, Mexicash y tanda: dados en el chat.
import { NOTION_INCOMES, NOTION_EXPENSES } from './notion.js';

const list = (arr) => arr.map(([date, amount]) => ({ date, amount }));

export const SEED_DEBTS = [
  // prioridad 0 = esencial, 1-3 = orden del plan
  { id: 'mexdin', name: 'Mexdin', priority: 1, status: 'activa', balance: 35367, monthly: 18190, rate: null, note: 'Cobranza agresiva. Varios pagos chicos hasta el 17 nov.' },
  { id: 'mexicash', name: 'Mexicash', priority: 1, status: 'activa', balance: 18559, monthly: 6540, rate: null, note: 'Quincenal. Desde el 30 nov baja a $963.' },
  { id: 'caja', name: 'Caja Popular', priority: 1, status: 'activa', balance: 89097, monthly: 3000, rate: null, note: 'Ponerla al corriente es lo más urgente.' },
  { id: 'jan', name: 'Préstamo Jan', priority: 2, status: 'activa', balance: 7005, monthly: 2335, rate: null, note: 'Préstamo con persona: si hace falta, pide mover la fecha.' },
  { id: 'laptop', name: 'Laptop', priority: 2, status: 'activa', balance: 2000, monthly: 1000, rate: null, note: '' },
  { id: 'kueski', name: 'Kueski', priority: 2, status: 'activa', balance: 468, monthly: 498, rate: null, note: 'Confirma la fecha del último pago.' },
  { id: 'seguro', name: 'Seguro carro', priority: 0, status: 'activa', balance: 15000, monthly: 3000, rate: null, note: 'Esencial: sin seguro no trabajas en plataformas.' },
  { id: 'plata', name: 'Plata Card', priority: 3, status: 'pausa', balance: 5461, monthly: 5461, rate: null, note: 'Plan: liquidar en diciembre y dejar de usarla.' },
  { id: 'rappi', name: 'Rappi', priority: 3, status: 'pausa', balance: 12000, monthly: 12000, rate: null, note: 'Dejar de usarla.' },
  { id: 'kubo2', name: 'Kubo Financiero II', priority: 3, status: 'pausa', balance: 6852, monthly: 2386, rate: null, note: 'Atrasado desde el 27 sep.' },
  { id: 'likeu', name: 'Santander LikeU', priority: 3, status: 'pausa', balance: 7920, monthly: 1500, rate: null, note: '' },
  { id: 'azteca', name: 'Banco Azteca', priority: 3, status: 'pausa', balance: 8612, monthly: 550, rate: null, note: '' },
  { id: 'kubo1', name: 'Kubo Financiero I', priority: 3, status: 'pausa', balance: 11678, monthly: 2189, rate: null, note: 'Atrasado desde el 5 sep.' },
  { id: 'nu', name: 'Nu TDC', priority: 3, status: 'pausa', balance: 13170, monthly: 1200, rate: null, note: '' },
  { id: 'didi', name: 'Didi Préstamos', priority: 2, status: 'activa', balance: 23840, monthly: 3966, rate: null, note: 'Quincenal. Lo pagas aparte de tus ganancias. Último pago el 15 mar.' },
  { id: 'hey', name: 'Hey Banco', priority: 3, status: 'pausa', balance: 42409, monthly: 3000, rate: null, note: 'Atrasado desde el 15 sep. Pide el monto para liquidar.' },
  { id: 'aero', name: 'Santander Aeroméxico', priority: 3, status: 'pausa', balance: 44826, monthly: 3500, rate: null, note: '' },
];

export const DIDI_SCHEDULE = { id: 's-didi', debtId: 'didi', name: 'Didi Préstamos', kind: 'deuda', type: 'list', items: list([
  ['2026-09-29', 2027], ['2026-10-14', 1983], ['2026-10-29', 1983], ['2026-11-17', 1983], ['2026-11-30', 1983], ['2026-12-14', 1983],
  ['2026-12-29', 1983], ['2027-01-14', 1983], ['2027-01-29', 1983], ['2027-02-15', 1983], ['2027-03-01', 1983], ['2027-03-15', 1982],
]) };

export const DEFAULT_SOURCES = [
  { name: 'Uber', color: '#C8F169', hint: 'Plataforma' },
  { name: 'Didi', color: '#A89CFF', hint: 'Plataforma' },
  { name: 'P5', color: '#7FD4E6', hint: 'Quincena de la prepa' },
  { name: 'Asesorías', color: '#6B717C', hint: 'Clases particulares' },
  { name: 'Otro', color: '#3A3F4A', hint: 'Lo demás' },
];

export const DATA_VERSION = 2;

// Tipos: list (fechas exactas), monthly (día del mes), semimonthly (15 y fin de mes)
export const SEED_SCHEDULES = [
  { id: 's-mexdin', debtId: 'mexdin', name: 'Mexdin', kind: 'deuda', type: 'list', items: list([
    ['2026-09-29', 6447], ['2026-10-01', 3400], ['2026-10-02', 3060], ['2026-10-04', 1345], ['2026-10-09', 550],
    ['2026-10-14', 2450], ['2026-10-16', 2891], ['2026-10-16', 1519], ['2026-10-17', 3063], ['2026-10-24', 549],
    ['2026-10-29', 2450], ['2026-10-31', 1519], ['2026-11-01', 3063], ['2026-11-17', 3061],
  ]) },
  { id: 's-mexicash', debtId: 'mexicash', name: 'Mexicash', kind: 'deuda', type: 'list', items: list([
    ['2026-09-30', 2971], ['2026-10-15', 3270], ['2026-10-30', 3270], ['2026-11-15', 3270], ['2026-11-30', 963],
    ['2026-12-15', 963], ['2026-12-30', 963], ['2027-01-15', 963], ['2027-01-30', 963], ['2027-02-15', 963],
  ]) },
  { id: 's-caja', debtId: 'caja', name: 'Caja Popular', kind: 'deuda', type: 'monthly', day: 24, amount: 3000, start: '2026-09-24', count: 30 },
  { id: 's-jan', debtId: 'jan', name: 'Préstamo Jan', kind: 'deuda', type: 'list', items: list([['2026-10-02', 2335], ['2026-11-02', 2335], ['2026-12-02', 2335]]) },
  { id: 's-laptop', debtId: 'laptop', name: 'Laptop', kind: 'deuda', type: 'list', items: list([['2026-10-15', 1000], ['2026-11-15', 1000]]) },
  { id: 's-kueski', debtId: 'kueski', name: 'Kueski', kind: 'deuda', type: 'list', items: list([['2026-10-01', 498]]) },
  { id: 's-seguro', debtId: 'seguro', name: 'Seguro carro', kind: 'deuda', type: 'monthly', day: 25, amount: 3000, start: '2026-10-25', count: 5 },
  // Atrasados de deudas en pausa: el plan los regulariza en diciembre
  { id: 's-atr-kubo1', debtId: 'kubo1', name: 'Kubo I · atrasado', kind: 'deuda', type: 'list', note: 'Venció el 5 sep · plan: diciembre', items: list([['2026-12-01', 2189]]) },
  { id: 's-atr-hey', debtId: 'hey', name: 'Hey Banco · atrasado', kind: 'deuda', type: 'list', note: 'Pago atrasado', items: list([['2026-09-15', 3000]]) },
  DIDI_SCHEDULE,
  { id: 's-atr-kubo2', debtId: 'kubo2', name: 'Kubo II · atrasado', kind: 'deuda', type: 'list', note: 'Venció el 27 sep · plan: diciembre', items: list([['2026-12-01', 2386]]) },
  { id: 's-plata', debtId: 'plata', name: 'Plata Card', kind: 'deuda', type: 'list', note: 'Plan: liquidarla en diciembre', items: list([['2026-12-19', 5461]]) },
  // Tanda: $3,000 cada 15 y fin de mes
  { id: 's-tanda', name: 'Tanda', kind: 'tanda', type: 'semimonthly', amount: 3000, start: '2026-09-30', end: '2027-03-31', note: 'Número 2: recibes ~$30,000 el 30 nov' },
  // Gastos fijos
  { id: 's-contador', name: 'Contador', kind: 'fijo', type: 'monthly', day: 1, amount: 750, start: '2026-10-01' },
  { id: 's-celular', name: 'Celular', kind: 'fijo', type: 'monthly', day: 10, amount: 450, start: '2026-10-10' },
  { id: 's-claude', name: 'Claude', kind: 'fijo', type: 'monthly', day: 12, amount: 400, start: '2026-10-12' },
  { id: 's-drive', name: 'Google Drive', kind: 'fijo', type: 'monthly', day: 12, amount: 35, start: '2026-10-12' },
  { id: 's-gym', name: 'Gimnasio', kind: 'fijo', type: 'monthly', day: 15, amount: 920, start: '2026-10-15' },
  { id: 's-internet', name: 'Internet', kind: 'fijo', type: 'monthly', day: 18, amount: 300, start: '2026-10-18' },
];

export const SEED_ENVELOPES = [
  { id: 'carro', name: 'Carro', hint: 'Servicio, llantas y reparaciones', goal: 6000, saved: 0, weekly: 280 },
  { id: 'emergencia', name: 'Emergencia', hint: 'Mini-fondo: meta de diciembre', goal: 5000, saved: 0, weekly: 0 },
];

export const EXPENSE_TAGS = [
  { name: 'Gasolina', amount: 450 },
  { name: 'Comida', amount: 120 },
  { name: 'Tienda', amount: 60 },
  { name: 'Casa', amount: 200 },
  { name: 'Carro', amount: 150 },
  { name: 'Salidas', amount: 200 },
  { name: 'Personal', amount: 150 },
  { name: 'Otros', amount: 100 },
];

export const INCOME_TAGS = [
  { name: 'Uber', amount: 1000 },
  { name: 'Didi', amount: 500 },
  { name: 'P5', amount: 3470 },
  { name: 'Asesorías', amount: 500 },
  { name: 'Otro', amount: 500 },
];

export const SEED_SETTINGS = {
  name: 'Rodrigo',
  budgetGas: 1150,        // por semana
  budgetPersonal: 350,    // por semana (comida y gastos personales)
  incomeGoalWeek: 8000,   // ~$35,000 al mes
  debtBudgetMonthly: 20600,
  snowballStart: '2027-01',
  period: 'semana',
};

let n = 0;
const uid = (p) => `${p}${(n++).toString(36)}`;

export function makeSeed() {
  return {
    version: 1,
    dataVersion: DATA_VERSION,
    incomeSources: DEFAULT_SOURCES.map((s) => ({ ...s })),
    createdAt: new Date().toISOString(),
    settings: { ...SEED_SETTINGS },
    debts: SEED_DEBTS.map((d) => ({ ...d, startBalance: d.balance })),
    schedules: SEED_SCHEDULES.map((s) => ({ ...s })),
    overrides: {},
    incomes: NOTION_INCOMES.map(([date, source, amount]) => ({ id: uid('n'), date, source, amount, from: 'notion' })),
    expenses: NOTION_EXPENSES.map(([date, category, amount]) => ({ id: uid('e'), date, category, amount, from: 'notion' })),
    abonos: [],
    weekMeta: {},
    envelopes: SEED_ENVELOPES.map((e) => ({ ...e })),
    expenseTags: EXPENSE_TAGS.map((t) => ({ ...t })),
    incomeTags: INCOME_TAGS.map((t) => ({ ...t })),
  };
}
