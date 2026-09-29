import { useMemo, useState } from 'react';
import { Bar, Confetti, Empty, Header, Icon, Money, Sheet, useConfetti } from '../components/ui.jsx';
import { debtTotals, pendingCount, projectDebts } from '../lib/calc.js';
import { fmtMonthYear } from '../lib/date.js';
import { clamp, money, pct } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

const PRIO = { 0: 'Esencial', 1: 'P1', 2: 'P2', 3: 'P3' };
const monthsBetween = (a, b) => {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

export const PrioBadge = ({ d }) => (
  <span className={`badge ${d.status === 'pausa' ? 'pausa' : `p${d.priority}`}`}>{d.status === 'pausa' ? 'En pausa' : PRIO[d.priority]}</span>
);

export default function Deudas({ go, openDebt }) {
  const { state, payments } = useStore();
  const [filter, setFilter] = useState('todas');
  const [adding, setAdding] = useState(false);
  const totals = debtTotals(state);
  const proj = useMemo(() => projectDebts(state, payments), [state, payments]);
  const active = state.debts.filter((d) => d.balance > 0.5);
  const paidOff = state.debts.filter((d) => d.balance <= 0.5);
  const shown = active
    .filter((d) => filter === 'todas' || (filter === 'pausa' ? d.status === 'pausa' : d.status !== 'pausa' && String(d.priority) === filter))
    .sort((a, b) => (a.status === 'pausa') - (b.status === 'pausa') || a.priority - b.priority || a.balance - b.balance);

  return (
    <div className="screen">
      <Header title={<>Deudas <span className="badge p3" style={{ verticalAlign: 'middle', marginLeft: 6 }}>{active.length}</span></>}
        right={<button className="icon-btn" onClick={() => setAdding(true)} aria-label="Agregar deuda"><Icon name="plus" size={20} /></button>} />

      {state.debts.length === 0 ? (
        <Empty icon="card" color="var(--coral)" title="Pon todo sobre la mesa" text="Agrega tus deudas con saldo y pago. Verlas juntas es el primer paso para salir de ellas." action="Agregar deuda" onAction={() => setAdding(true)} />
      ) : (
        <>
          <div className="card">
            <div className="muted">Te faltan</div>
            <Money value={totals.now} style={{ fontSize: 44, display: 'block', margin: '2px 0 14px' }} />
            <Bar value={totals.pct} />
            <div className="between small" style={{ marginTop: 10 }}>
              <span className="muted">Llevas {pct(totals.pct)} pagado</span>
              <span className="muted">Libre en {proj.freedom ? fmtMonthYear(proj.freedom) : '—'}</span>
            </div>
          </div>

          <div className="chips block" style={{ marginTop: 16 }}>
            {[['todas', 'Todas'], ['0', 'Esencial'], ['1', 'Prioridad 1'], ['2', 'Prioridad 2'], ['3', 'Prioridad 3'], ['pausa', 'En pausa']].map(([k, l]) => (
              <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>

          <div className="stack" style={{ marginTop: 14 }}>
            {shown.map((d) => {
              const paid = d.startBalance ? clamp((d.startBalance - d.balance) / d.startBalance, 0, 1) : 0;
              return (
                <button key={d.id} className="card" style={{ width: '100%', textAlign: 'left', border: d.priority === 1 && d.status !== 'pausa' ? '1px solid #3d4a1f' : '1px solid transparent', animation: 'fadeIn .25s var(--ease)' }} onClick={() => openDebt(d.id)}>
                  <div className="between"><span style={{ fontWeight: 600 }}>{d.name}</span><PrioBadge d={d} /></div>
                  <div className="between" style={{ alignItems: 'baseline', margin: '4px 0 10px' }}>
                    <span className="num" style={{ fontSize: 28 }}>{money(d.balance)}</span>
                    <span className="muted small">{pct(paid)} pagado</span>
                  </div>
                  <Bar value={paid} tone={d.status === 'pausa' ? 'violet' : ''} thin />
                  <div className="between small faint" style={{ marginTop: 8 }}>
                    <span>{(() => { const n = pendingCount(d, payments); return `${n} ${n === 1 ? 'pago restante' : 'pagos restantes'}`; })()}</span>
                    <span>Libre en {proj.payoff[d.id] ? fmtMonthYear(proj.payoff[d.id]) : '—'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {paidOff.length > 0 && (
            <div className="block">
              <div className="caps lime" style={{ marginBottom: 10 }}>Liquidadas · {paidOff.length}</div>
              {paidOff.map((d) => (
                <button key={d.id} className="list-row done" style={{ width: '100%' }} onClick={() => openDebt(d.id)}>
                  <span className="check on"><Icon name="check" size={16} /></span>
                  <span className="grow" style={{ textAlign: 'left', fontWeight: 600 }}>{d.name}</span>
                  <span className="num">{money(d.startBalance)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="faint small block">Los saldos bajan cuando marcas un pago o registras un abono. Son aproximados: ajústalos con tu estado de cuenta cuando puedas.</p>
        </>
      )}
      {adding && <DebtForm onClose={() => setAdding(false)} />}
    </div>
  );
}

export function DebtDetail({ id, back }) {
  const { state, dispatch, payments, notify } = useStore();
  const d = state.debts.find((x) => x.id === id);
  const [extra, setExtra] = useState(Math.min(5000, Math.round((d?.balance || 0) / 2 / 100) * 100));
  const [editing, setEditing] = useState(false);
  const [confetti, fire] = useConfetti();
  const base = useMemo(() => projectDebts(state, payments), [state, payments]);
  const withExtra = useMemo(() => projectDebts(state, payments, { extra: { id, amount: extra } }), [state, payments, id, extra]);
  if (!d) return null;
  const paid = d.startBalance ? clamp((d.startBalance - d.balance) / d.startBalance, 0, 1) : 0;
  const before = base.payoff[id];
  const after = withExtra.payoff[id];
  const saved = before && after ? Math.max(0, monthsBetween(after, before)) : 0;
  const interestSaved = d.rate ? Math.max(0, (base.interest[id] || 0) - (withExtra.interest[id] || 0)) : null;
  const maxExtra = Math.max(500, Math.ceil(d.balance / 500) * 500);
  const upcoming = payments.filter((p) => p.debtId === id && !p.paid).slice(0, 4);

  const abonar = () => {
    if (!extra) return;
    const amt = Math.min(extra, d.balance);
    dispatch({ type: 'abono', debtId: id, amount: amt });
    if (d.balance - amt <= 0.5) { fire(); notify(`¡${d.name} liquidada! Una menos.`); } else notify(`Abono de ${money(amt)} registrado`);
  };

  return (
    <div className="screen">
      <Confetti show={confetti} />
      <Header title={d.name} back={back} right={<PrioBadge d={d} />} />
      <div className="card">
        <div className="muted">Saldo</div>
        <Money value={d.balance} style={{ fontSize: 44, display: 'block', margin: '2px 0 14px' }} />
        <Bar value={paid} />
        <div className="block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
          <Stat label="Pago mensual" value={money(d.monthly)} />
          <Stat label="Tasa anual" value={d.rate ? `${d.rate}%` : 'Sin dato'} />
          <Stat label="Pagos restantes" value={pendingCount(d, payments)} />
          <Stat label="Libre en" value={before ? fmtMonthYear(before) : '—'} />
        </div>
        {d.note && <p className="faint small" style={{ marginTop: 14 }}>{d.note}</p>}
        <button className="btn ghost" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Editar deuda</button>
      </div>

      {d.balance > 0.5 && (
        <div className="card block">
          <div className="h3">¿Y si abonas a capital?</div>
          <div className="muted small">Mueve la barra y mira cuánto te ahorras.</div>
          <Money value={extra} style={{ fontSize: 36, display: 'block', margin: '12px 0', color: 'var(--violet)' }} duration={150} />
          <input type="range" min={0} max={maxExtra} step={100} value={Math.min(extra, maxExtra)} onChange={(e) => setExtra(Number(e.target.value))} aria-label="Monto del abono" />
          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            {[1000, 5000, 10000].map((v) => (
              <button key={v} className={`chip grow ${extra === v ? 'on' : ''}`} style={extra === v ? { borderColor: 'var(--violet)', background: '#22203a' } : {}} onClick={() => setExtra(v)}>{money(v)}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div className="card2" style={{ padding: 14 }}>
              <div className="muted small">Te ahorras</div>
              <div className="num violet" style={{ fontSize: 26 }}>{saved} {saved === 1 ? 'mes' : 'meses'}</div>
            </div>
            <div className="card2" style={{ padding: 14 }}>
              <div className="muted small">En intereses</div>
              <div className="num violet" style={{ fontSize: interestSaved == null ? 15 : 26, paddingTop: interestSaved == null ? 6 : 0 }}>{interestSaved == null ? 'Agrega la tasa para calcularlo' : money(interestSaved)}</div>
            </div>
          </div>
          <div className="small" style={{ marginTop: 14 }}>
            <Compare label="Antes" value={1} text={before ? fmtMonthYear(before) : '—'} />
            <Compare label="Después" value={before && after ? clamp(1 - saved / Math.max(1, monthsBetween(base.series[0].ym, before) + 1), 0.05, 1) : 1} text={after ? fmtMonthYear(after) : '—'} lime />
          </div>
          <button className="btn primary block" style={{ marginTop: 16 }} onClick={abonar} disabled={!extra}>Registrar abono de {money(Math.min(extra, d.balance))}</button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="block">
          <div className="caps faint" style={{ marginBottom: 10 }}>Próximos pagos</div>
          {upcoming.map((p) => (
            <div key={p.key} className="list-row"><span className="grow">{p.date.split('-').reverse().slice(0, 2).join('/')}</span><span className="num">{money(p.amount)}</span></div>
          ))}
        </div>
      )}
      {editing && <DebtForm debt={d} onClose={() => setEditing(false)} onRemoved={back} />}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div><div className="muted small">{label}</div><div className="num" style={{ fontSize: 20 }}>{value}</div></div>
);
const Compare = ({ label, value, text, lime }) => (
  <div className="row" style={{ marginTop: 6 }}>
    <span className="faint" style={{ width: 64 }}>{label}</span>
    <div className="grow"><Bar value={value} tone={lime ? '' : 'violet'} thin /></div>
    <span style={{ width: 70, textAlign: 'right', fontWeight: 600 }} className={lime ? 'lime' : ''}>{text}</span>
  </div>
);

export function DebtForm({ debt, onClose, onRemoved }) {
  const { dispatch, notify } = useStore();
  const [f, setF] = useState({
    name: debt?.name || '', balance: debt?.balance ?? '', monthly: debt?.monthly ?? '', rate: debt?.rate ?? '',
    priority: debt?.priority ?? 3, status: debt?.status || 'activa', note: debt?.note || '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const patch = { name: f.name.trim(), balance: Number(f.balance) || 0, monthly: Number(f.monthly) || 0, rate: f.rate === '' ? null : Number(f.rate), priority: Number(f.priority), status: f.status, note: f.note };
    if (!patch.name) return notify('Ponle nombre');
    if (debt) dispatch({ type: 'updateDebt', id: debt.id, patch });
    else dispatch({ type: 'addDebt', debt: patch });
    notify(debt ? 'Deuda actualizada' : 'Deuda agregada');
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 16 }}>{debt ? 'Editar deuda' : 'Nueva deuda'}</div>
      <div className="stack">
        <label className="field"><span>Nombre</span><input value={f.name} onChange={set('name')} /></label>
        <div className="row">
          <label className="field grow"><span>Saldo actual</span><input inputMode="decimal" value={f.balance} onChange={set('balance')} /></label>
          <label className="field grow"><span>Pago mensual</span><input inputMode="decimal" value={f.monthly} onChange={set('monthly')} /></label>
        </div>
        <div className="row">
          <label className="field grow"><span>Tasa anual % (opcional)</span><input inputMode="decimal" value={f.rate} onChange={set('rate')} placeholder="Ej. 60" /></label>
          <label className="field grow"><span>Prioridad</span>
            <select value={f.priority} onChange={set('priority')}><option value={0}>Esencial</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select>
          </label>
        </div>
        <label className="field"><span>Estado</span>
          <select value={f.status} onChange={set('status')}><option value="activa">Activa (la estoy pagando)</option><option value="pausa">En pausa (negociar después)</option></select>
        </label>
        <label className="field"><span>Nota</span><input value={f.note} onChange={set('note')} /></label>
      </div>
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save}>Guardar</button>
      {debt && (
        <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--coral)' }} onClick={() => {
          if (!window.confirm(`¿Borrar ${debt.name} y sus pagos programados?`)) return;
          dispatch({ type: 'removeDebt', id: debt.id }); onClose(); onRemoved?.();
        }}>Borrar deuda</button>
      )}
    </Sheet>
  );
}
