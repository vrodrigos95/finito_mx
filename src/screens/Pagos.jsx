import { useMemo, useState } from 'react';
import { Bar, Confetti, Empty, Header, Icon, Money, Sheet, useConfetti } from '../components/ui.jsx';
import { fmtShort, quincenaKey, quincenaLabel, quincenaTitle, relDays, today } from '../lib/date.js';
import { money, sum } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

export default function Pagos() {
  const { state, dispatch, payments, notify } = useStore();
  const [edit, setEdit] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confetti, fire] = useConfetti();
  const t = today();
  const curQ = quincenaKey(t);

  const late = payments.filter((p) => !p.paid && p.date < t);
  const groups = useMemo(() => {
    const g = new Map();
    for (const p of payments) {
      if (p.date < t && !p.paid) continue;
      const q = quincenaKey(p.date);
      if (q < curQ) continue;
      if (!g.has(q)) g.set(q, []);
      g.get(q).push(p);
    }
    return [...g.entries()];
  }, [payments, t, curQ]);
  const visible = showAll ? groups : groups.slice(0, 4);
  const cur = groups.find(([q]) => q === curQ)?.[1] || [];
  const curTotal = sum(cur, (p) => p.amount);
  const curPending = sum(cur.filter((p) => !p.paid), (p) => p.amount);
  const curDone = cur.filter((p) => p.paid).length;
  const nextKey = payments.find((p) => !p.paid && p.date >= t)?.key;

  const toggle = (p) => {
    dispatch({ type: 'togglePaid', payment: p });
    if (!p.paid) {
      const debt = state.debts.find((d) => d.id === p.debtId);
      if (debt && debt.balance - p.amount <= 0.5) {
        fire();
        notify(`¡${debt.name} liquidada! Una menos.`);
      } else {
        notify('¡Una menos!', () => dispatch({ type: 'togglePaid', payment: { ...p, paid: true } }));
      }
    }
  };

  const Row = ({ p, isLate }) => (
    <div className={`list-row ${p.paid ? 'done' : ''} ${isLate ? 'late' : ''} ${p.key === nextKey ? 'next' : ''}`}>
      <button className={`check ${p.paid ? 'on' : ''} ${isLate ? 'late' : ''}`} onClick={() => toggle(p)} aria-label={p.paid ? 'Marcar pendiente' : 'Marcar pagado'}>
        {p.paid && <Icon name="check" size={16} />}
      </button>
      <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => setEdit(p)}>
        {p.key === nextKey && <span className="badge" style={{ height: 18, fontSize: 11, marginBottom: 2 }}>Próximo</span>}
        <div style={{ fontWeight: 600 }} className="ellipsis">{p.name}</div>
        <div className={`small ${isLate ? 'coral' : p.key === nextKey ? 'lime' : 'faint'}`}>
          {isLate ? `Venció el ${fmtShort(p.date).toLowerCase()}` : `${fmtShort(p.date)} · ${relDays(p.date, t)}`}
          {p.note && !isLate ? ` · ${p.note}` : ''}
        </div>
      </button>
      <div className="num" style={{ fontSize: 18, textDecoration: p.paid ? 'line-through' : 'none' }}>{money(p.amount)}</div>
    </div>
  );

  return (
    <div className="screen">
      <Header title="Pagos" right={<button className="icon-btn" onClick={() => setAdding(true)} aria-label="Agregar pago"><Icon name="plus" size={20} /></button>} />
      <Confetti show={confetti} />

      <div className="card">
        <div className="between">
          <span className="muted">Quincena {quincenaLabel(curQ)}</span>
          <span className="lime small" style={{ fontWeight: 600 }}>{curDone} de {cur.length} listos</span>
        </div>
        <Money value={curPending} style={{ fontSize: 40, display: 'block', margin: '4px 0 2px' }} />
        <div className="faint small" style={{ marginBottom: 12 }}>por pagar de {money(curTotal)}</div>
        <Bar value={curTotal ? (curTotal - curPending) / curTotal : 0} />
      </div>

      {late.length > 0 && (
        <div className="block">
          <div className="between" style={{ marginBottom: 10 }}>
            <span className="caps coral">Se pasó la fecha</span>
            <span className="faint small">Sin estrés, págalo y listo</span>
          </div>
          {late.map((p) => <Row key={p.key} p={p} isLate />)}
        </div>
      )}

      {groups.length === 0 && late.length === 0 && (
        <Empty icon="cal" title="Nada que pagar esta quincena" text="Estás al corriente. Respira." />
      )}

      {visible.map(([q, items]) => (
        <div className="block" key={q}>
          <div className="between" style={{ marginBottom: 10 }}>
            <span className="caps faint">{quincenaTitle(q)}</span>
            <span className="faint small">{money(sum(items.filter((p) => !p.paid), (p) => p.amount))}</span>
          </div>
          {items.map((p) => <Row key={p.key} p={p} />)}
        </div>
      ))}
      {groups.length > 4 && (
        <button className="btn secondary block" style={{ marginTop: 20 }} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Ver menos' : `Ver ${groups.length - 4} quincenas más`}
        </button>
      )}

      {edit && <EditPayment p={edit} onClose={() => setEdit(null)} onToggle={() => { toggle(edit); setEdit(null); }} />}
      {adding && <AddPayment onClose={() => setAdding(false)} />}
    </div>
  );
}

function EditPayment({ p, onClose, onToggle }) {
  const { dispatch, notify } = useStore();
  const [date, setDate] = useState(p.date);
  const [amount, setAmount] = useState(String(p.amount));
  const save = () => {
    const patch = {};
    if (date !== p.date) patch.date = date;
    if (Number(amount) !== p.amount && Number(amount) > 0) patch.amount = Number(amount);
    if (Object.keys(patch).length) {
      if (p.paid && patch.amount) notify('Desmarca y vuelve a marcar para ajustar el saldo');
      dispatch({ type: 'editPayment', key: p.key, patch });
      notify('Pago actualizado');
    }
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2">{p.name}</div>
      <div className="muted small" style={{ marginBottom: 16 }}>{p.origDate !== p.date ? `Fecha original: ${fmtShort(p.origDate)}` : p.note || (p.kind === 'fijo' ? 'Gasto fijo' : p.kind === 'tanda' ? 'Tanda' : 'Deuda')}</div>
      <div className="stack">
        <label className="field"><span>Fecha</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        <label className="field"><span>Monto</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></label>
      </div>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn secondary grow" onClick={onToggle}>{p.paid ? 'Marcar pendiente' : 'Marcar pagado'}</button>
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
      <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--coral)' }} onClick={() => { dispatch({ type: 'editPayment', key: p.key, patch: { deleted: true } }); notify('Pago quitado'); onClose(); }}>Quitar este pago</button>
    </Sheet>
  );
}

function AddPayment({ onClose }) {
  const { state, dispatch, notify } = useStore();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [repeat, setRepeat] = useState('once');
  const [debtId, setDebtId] = useState('');
  const save = () => {
    const a = Number(amount);
    if (!name.trim() || !a) return notify('Pon nombre y monto');
    const base = { name: name.trim(), kind: debtId ? 'deuda' : 'fijo', debtId: debtId || undefined };
    const schedule = repeat === 'once'
      ? { ...base, type: 'list', items: [{ date, amount: a }] }
      : { ...base, type: 'monthly', day: Number(date.slice(8)), amount: a, start: date };
    dispatch({ type: 'addSchedule', schedule });
    notify('Pago agregado');
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 16 }}>Nuevo pago</div>
      <div className="stack">
        <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Luz, Coppel…" /></label>
        <label className="field"><span>Monto</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></label>
        <label className="field"><span>Fecha</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        <label className="field"><span>Se repite</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)}><option value="once">Una sola vez</option><option value="monthly">Cada mes, mismo día</option></select>
        </label>
        <label className="field"><span>¿Es pago de una deuda? (baja su saldo)</span>
          <select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
            <option value="">No, es un gasto fijo</option>
            {state.debts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save}>Agregar</button>
    </Sheet>
  );
}
