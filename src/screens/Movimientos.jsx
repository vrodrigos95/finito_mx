import { useMemo, useState } from 'react';
import { Header, Icon, Seg, Sheet } from '../components/ui.jsx';
import { sourceColor, sourceList } from '../lib/calc.js';
import { addDays, addMonths, fmtMonthLong, fmtShort, monthKey, today } from '../lib/date.js';
import { money } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

const CAT_COLOR = {
  Gasolina: '#C8F169', Comida: '#FF8B78', Tienda: '#F3C969', Casa: '#7FD4E6', Carro: '#A89CFF',
  Salidas: '#E58FD8', Personal: '#8FB3FF', Servicios: '#6B717C', Otros: '#80858F',
};
const catColor = (c) => CAT_COLOR[c] || '#80858F';
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PAGE = 60;

export default function Movimientos({ back }) {
  const { state } = useStore();
  const [type, setType] = useState('gasto');
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('mes');
  const [cat, setCat] = useState('Todas');
  const [sort, setSort] = useState('fecha');
  const [limit, setLimit] = useState(PAGE);
  const [edit, setEdit] = useState(null);

  const cur = monthKey(today());
  const prev = addMonths(cur, -1);
  const isGasto = type === 'gasto';
  const raw = isGasto ? state.expenses : state.incomes;
  const catOf = (x) => (isGasto ? x.category : x.source);

  const inPeriod = useMemo(() => raw.filter((x) => {
    if (period === 'mes') return monthKey(x.date) === cur;
    if (period === 'anterior') return monthKey(x.date) === prev;
    if (period === '30') return x.date >= addDays(today(), -30) && x.date <= today();
    return true;
  }), [raw, period, cur, prev]);

  const cats = useMemo(() => {
    const m = {};
    for (const x of inPeriod) m[catOf(x)] = (m[catOf(x)] || 0) + x.amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [inPeriod, isGasto]); // eslint-disable-line

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    const num = q.replace(/[^\d]/g, '');
    const list = inPeriod.filter((x) => {
      if (cat !== 'Todas' && catOf(x) !== cat) return false;
      if (!nq) return true;
      return norm(x.note).includes(nq) || norm(catOf(x)).includes(nq) || (num && String(Math.round(x.amount)).includes(num));
    });
    return list.sort((a, b) => (sort === 'monto' ? b.amount - a.amount : a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [inPeriod, q, cat, sort, isGasto]); // eslint-disable-line

  const total = filtered.reduce((s, x) => s + x.amount, 0);
  const shown = filtered.slice(0, limit);
  const groups = [];
  if (sort === 'fecha') {
    for (const x of shown) {
      const g = groups.at(-1);
      if (g && g.date === x.date) g.items.push(x);
      else groups.push({ date: x.date, items: [x] });
    }
  }
  const color = (c) => (isGasto ? catColor(c) : sourceColor(state, c));

  const Row = ({ x }) => (
    <button className="list-row" style={{ width: '100%', textAlign: 'left', padding: '12px 14px' }} onClick={() => setEdit(x)}>
      <i style={{ width: 8, height: 8, borderRadius: 99, background: color(catOf(x)), flex: 'none' }} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }} className="ellipsis">{x.note || catOf(x)}</div>
        <div className="faint small">{catOf(x)}{sort === 'monto' ? ` · ${fmtShort(x.date)}` : ''}</div>
      </div>
      <div className="num" style={{ fontSize: 17, color: isGasto ? 'var(--text)' : 'var(--lime)' }}>{isGasto ? '' : '+'}{money(x.amount)}</div>
    </button>
  );

  const periods = [['mes', fmtMonthLong(cur).split(' ')[0]], ['anterior', fmtMonthLong(prev).split(' ')[0]], ['30', 'Últimos 30 días'], ['todo', 'Todo']];

  return (
    <div className="screen">
      <Header title="Movimientos" back={back} />
      <Seg options={[['gasto', 'Gastos'], ['ingreso', 'Ingresos']]} value={type} onChange={(v) => { setType(v); setCat('Todas'); setLimit(PAGE); }} />

      <label className="row card2" style={{ marginTop: 14, height: 48, padding: '0 14px', gap: 10, border: '1px solid var(--line)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text3)', flex: 'none' }} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input className="grow" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={isGasto ? 'Buscar: oxxo, gasolina, 450…' : 'Buscar: uber, quincena…'} aria-label="Buscar" enterKeyHint="search" />
        {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" style={{ color: 'var(--text3)' }}><Icon name="x" size={18} /></button>}
      </label>

      <div className="chips" style={{ marginTop: 12 }}>
        {periods.map(([k, l]) => <button key={k} className={`chip ${period === k ? 'on' : ''}`} onClick={() => { setPeriod(k); setLimit(PAGE); }}>{l}</button>)}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {['Todas', ...cats].map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => { setCat(c); setLimit(PAGE); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {c !== 'Todas' && <i style={{ width: 7, height: 7, borderRadius: 99, background: color(c) }} />}{c}
          </button>
        ))}
      </div>

      <div className="card block between" style={{ marginTop: 14, padding: '14px 18px' }}>
        <div>
          <div className="muted small">{filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}</div>
          <div className="num" style={{ fontSize: 26, color: isGasto ? 'var(--text)' : 'var(--lime)' }}>{money(total)}</div>
        </div>
        <button className="chip" onClick={() => setSort(sort === 'fecha' ? 'monto' : 'fecha')} aria-label="Cambiar orden">
          {sort === 'fecha' ? 'Más recientes' : 'Más caros'} ↕
        </button>
      </div>

      {filtered.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: 30 }}>No hay movimientos con esos filtros.</p>}

      {sort === 'fecha'
        ? groups.map((g) => (
          <div key={g.date} className="block" style={{ marginTop: 18 }}>
            <div className="between" style={{ marginBottom: 8 }}>
              <span className="caps faint">{fmtShort(g.date)}</span>
              <span className="faint small num">{money(g.items.reduce((s, x) => s + x.amount, 0))}</span>
            </div>
            {g.items.map((x) => <Row key={x.id} x={x} />)}
          </div>
        ))
        : <div style={{ marginTop: 14 }}>{shown.map((x) => <Row key={x.id} x={x} />)}</div>}

      {filtered.length > limit && (
        <button className="btn secondary block" style={{ marginTop: 18 }} onClick={() => setLimit(limit + PAGE)}>Ver {Math.min(PAGE, filtered.length - limit)} más</button>
      )}

      {edit && <EditMovimiento item={edit} isGasto={isGasto} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditMovimiento({ item, isGasto, onClose }) {
  const { state, dispatch, notify } = useStore();
  const [amount, setAmount] = useState(String(item.amount));
  const [cat, setCat] = useState(isGasto ? item.category : item.source);
  const [date, setDate] = useState(item.date);
  const [note, setNote] = useState(item.note || '');
  const options = isGasto
    ? [...new Set([...state.expenseTags.map((t) => t.name), 'Servicios', item.category])]
    : [...new Set([...sourceList(state).map((s) => s.name), item.source])];

  const save = () => {
    const a = Number(amount);
    if (!a) return notify('Pon un monto');
    const patch = { amount: a, date, note: note.trim(), [isGasto ? 'category' : 'source']: cat };
    dispatch({ type: isGasto ? 'updateExpense' : 'updateIncome', id: item.id, patch });
    notify('Movimiento actualizado');
    onClose();
  };
  const remove = () => {
    dispatch({ type: isGasto ? 'removeExpense' : 'removeIncome', id: item.id });
    notify('Movimiento borrado', () => dispatch({ type: isGasto ? 'addExpense' : 'addIncome', item }));
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 16 }}>{isGasto ? 'Editar gasto' : 'Editar ingreso'}</div>
      <div className="stack">
        <label className="field"><span>Descripción</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Oxxo, Starbucks…" /></label>
        <div className="row">
          <label className="field grow"><span>Monto</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></label>
          <label className="field grow"><span>Fecha</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        </div>
        <label className="field"><span>{isGasto ? 'Categoría' : 'Tipo'}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
      </div>
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save}>Guardar</button>
      <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--coral)' }} onClick={remove}>Borrar movimiento</button>
    </Sheet>
  );
}
