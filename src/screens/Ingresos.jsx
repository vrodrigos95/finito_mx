import { useEffect, useMemo, useState } from 'react';
import { Header, Icon, Money, Seg, Sheet } from '../components/ui.jsx';
import { monthIncome, nextSourceColor, sourceColor, sourceList, weekIncome } from '../lib/calc.js';
import { addDays, addMonths, fmtDayMonth, fmtMonthLong, monthKey, today, weekStart } from '../lib/date.js';
import { money } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

const Nav = ({ label, onPrev, onNext, disableNext }) => (
  <div className="row card2" style={{ gap: 2, padding: 4, borderRadius: 99 }}>
    <button className="icon-btn" style={{ width: 34, height: 34, background: 'none' }} onClick={onPrev} aria-label="Anterior"><Icon name="back" size={16} /></button>
    <span className="small" style={{ fontWeight: 600, minWidth: 92, textAlign: 'center' }}>{label}</span>
    <button className="icon-btn" style={{ width: 34, height: 34, background: 'none', opacity: disableNext ? 0.3 : 1 }} disabled={disableNext} onClick={onNext} aria-label="Siguiente"><Icon name="next" size={16} /></button>
  </div>
);

const Stack = ({ state, inc }) => (
  <div style={{ display: 'flex', gap: 3, height: 10, borderRadius: 99, overflow: 'hidden', background: 'var(--line)' }}>
    {inc.names.filter((s) => inc.bySource[s] > 0).map((s) => (
      <i key={s} style={{ flex: inc.bySource[s], background: sourceColor(state, s), transition: 'flex .25s var(--ease)' }} />
    ))}
  </div>
);

const GoalChip = ({ total, goal }) => (
  <div style={{ marginTop: 12 }}>
    {total >= goal
      ? <span className="chip on" style={{ display: 'inline-flex', alignItems: 'center', height: 30, fontSize: 13 }}>+{money(total - goal)} arriba de tu meta de {money(goal)}</span>
      : <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', height: 30, fontSize: 13 }}>Faltan {money(goal - total)} para tu meta de {money(goal)}</span>}
  </div>
);

export default function Ingresos({ back }) {
  const { state } = useStore();
  const [view, setView] = useState('semana');
  const [ws, setWs] = useState(weekStart(today()));
  const [ym, setYm] = useState(monthKey(today()));
  const [managing, setManaging] = useState(false);
  const we = addDays(ws, 6);
  const isCurWeek = ws === weekStart(today());
  const isCurMonth = ym === monthKey(today());

  return (
    <div className="screen">
      <Header title="Ingresos" back={back} right={
        view === 'semana'
          ? <Nav label={`${ws.slice(5, 7) === we.slice(5, 7) ? fmtDayMonth(ws).split(' ')[0] : fmtDayMonth(ws)}–${fmtDayMonth(we)}`} onPrev={() => setWs(addDays(ws, -7))} onNext={() => setWs(addDays(ws, 7))} disableNext={isCurWeek} />
          : <Nav label={fmtMonthLong(ym)} onPrev={() => setYm(addMonths(ym, -1))} onNext={() => setYm(addMonths(ym, 1))} disableNext={isCurMonth} />
      } />
      <div style={{ marginBottom: 14 }}>
        <Seg options={[['semana', 'Por semana'], ['mes', 'Por mes']]} value={view} onChange={setView} />
      </div>
      {view === 'semana' ? <Week ws={ws} isCurrent={isCurWeek} /> : <Month ym={ym} isCurrent={isCurMonth} />}
      <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => setManaging(true)}><Icon name="edit" size={16} /> Tipos de ingreso</button>
      {managing && <ManageSources onClose={() => setManaging(false)} />}
      {!sourceList(state).length && <p className="faint small">Agrega al menos un tipo de ingreso.</p>}
    </div>
  );
}

function Week({ ws, isCurrent }) {
  const { state, dispatch, notify } = useStore();
  const inc = weekIncome(state, ws);
  const goal = state.settings.incomeGoalWeek;
  const meta = state.weekMeta[ws] || {};
  const horas = meta.horas || 0;
  const plat = (inc.bySource.Uber || 0) + (inc.bySource.Didi || 0);
  const hints = Object.fromEntries(sourceList(state).map((s) => [s.name, s.hint]));

  return (
    <>
      <div className="card">
        <div className="muted">{meta.closed ? 'Cerraste la semana con' : isCurrent ? 'Llevas esta semana' : 'Esa semana hiciste'}</div>
        <Money value={inc.total} style={{ fontSize: 44, display: 'block', margin: '2px 0 12px' }} />
        <Stack state={state} inc={inc} />
        <GoalChip total={inc.total} goal={goal} />
      </div>

      <div className="card block" style={{ padding: '6px 16px' }}>
        {inc.names.map((s, i) => (
          <SourceRow key={s + ws} source={s} hint={hints[s] || 'Tipo eliminado'} color={sourceColor(state, s)} value={inc.bySource[s]} last={i === inc.names.length - 1}
            onSave={(v) => dispatch({ type: 'setWeekSource', ws, we: inc.we, source: s, amount: v })} />
        ))}
      </div>

      <div className="card block between">
        <div>
          <div style={{ fontWeight: 600 }}>Horas manejadas</div>
          <div className="faint small">Opcional · Uber + Didi</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => dispatch({ type: 'setWeekMeta', ws, patch: { horas: Math.max(0, horas - 1) } })} aria-label="Menos horas"><Icon name="minus" size={18} /></button>
          <span className="num" style={{ fontSize: 22, minWidth: 54, textAlign: 'center' }}>{horas} h</span>
          <button className="icon-btn" onClick={() => dispatch({ type: 'setWeekMeta', ws, patch: { horas: horas + 1 } })} aria-label="Más horas"><Icon name="plus" size={18} /></button>
        </div>
      </div>

      {horas > 0 && (
        <div className="card block">
          <div className="muted">Ganaste por hora</div>
          <Money value={plat / horas} style={{ fontSize: 36, display: 'block' }} />
          <div className="faint small">Uber + Didi ({money(plat)}) entre {horas} horas</div>
        </div>
      )}

      <button className={`btn block ${meta.closed ? 'secondary' : 'primary'}`} style={{ marginTop: 20 }}
        onClick={() => { dispatch({ type: 'setWeekMeta', ws, patch: { closed: !meta.closed } }); if (!meta.closed) notify(inc.total >= goal ? '¡Semana cerrada! Meta cumplida.' : 'Semana cerrada. La que sigue va.'); }}>
        {meta.closed ? <><Icon name="check" size={18} /> Semana cerrada</> : 'Cerrar mi semana'}
      </button>
    </>
  );
}

function Month({ ym, isCurrent }) {
  const { state } = useStore();
  const inc = monthIncome(state, ym);
  const prev = monthIncome(state, addMonths(ym, -1));
  const goal = Math.round((state.settings.incomeGoalWeek * 52) / 12);
  // Semanas (lunes) que empiezan dentro del mes
  const weeks = useMemo(() => {
    const out = [];
    let w = weekStart(inc.from);
    if (w < inc.from) w = addDays(w, 7);
    for (; w <= inc.to; w = addDays(w, 7)) out.push(weekIncome(state, w));
    return out;
  }, [state, inc.from, inc.to]);
  const maxW = Math.max(1, ...weeks.map((w) => w.total));
  const diff = inc.total - prev.total;

  return (
    <>
      <div className="card">
        <div className="muted">{isCurrent ? 'Llevas este mes' : `Ganaste en ${fmtMonthLong(ym).split(' ')[0].toLowerCase()}`}</div>
        <Money value={inc.total} style={{ fontSize: 44, display: 'block', margin: '2px 0 12px' }} />
        <Stack state={state} inc={inc} />
        <GoalChip total={inc.total} goal={goal} />
        {prev.total > 0 && (
          <div className="small" style={{ marginTop: 10 }}>
            <span className={diff >= 0 ? 'lime' : 'coral'} style={{ fontWeight: 600 }}>{diff >= 0 ? '+' : '−'}{money(Math.abs(diff))}</span>
            <span className="muted"> contra {fmtMonthLong(addMonths(ym, -1)).split(' ')[0].toLowerCase()} ({money(prev.total)})</span>
          </div>
        )}
      </div>

      <div className="card block" style={{ padding: '6px 16px' }}>
        {inc.names.filter((s) => inc.bySource[s] > 0 || sourceList(state).some((x) => x.name === s)).map((s, i, arr) => (
          <div key={s} className="between" style={{ padding: '14px 0', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--line)' }}>
            <span className="row" style={{ gap: 10 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: sourceColor(state, s) }} /><span style={{ fontWeight: 600 }}>{s}</span></span>
            <span className="row" style={{ gap: 10 }}>
              <span className="faint small">{inc.total ? Math.round((inc.bySource[s] / inc.total) * 100) : 0}%</span>
              <span className="num" style={{ fontSize: 18 }}>{money(inc.bySource[s])}</span>
            </span>
          </div>
        ))}
      </div>

      {weeks.length > 0 && (
        <div className="card block">
          <div className="h3" style={{ marginBottom: 10 }}>Semana por semana</div>
          {weeks.map((w) => (
            <div key={w.ws} style={{ marginTop: 10 }}>
              <div className="between small"><span className="muted">{fmtDayMonth(w.ws)} – {fmtDayMonth(w.we)}</span><span className="num">{money(w.total)}</span></div>
              <div className="bar thin" style={{ marginTop: 6 }}><i style={{ width: `${(w.total / maxW) * 100}%`, background: 'var(--violet)' }} /></div>
            </div>
          ))}
          <p className="faint xs" style={{ marginTop: 12 }}>Para editar montos cambia a «Por semana».</p>
        </div>
      )}
    </>
  );
}

function ManageSources({ onClose }) {
  const { state, dispatch, notify } = useStore();
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const list = sourceList(state);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (list.some((s) => s.name.toLowerCase() === n.toLowerCase())) return notify('Ese tipo ya existe');
    dispatch({ type: 'addSource', source: { name: n.charAt(0).toUpperCase() + n.slice(1), hint: hint.trim(), color: nextSourceColor(state) } });
    notify(`${n} agregado`);
    setName('');
    setHint('');
  };
  const remove = (s) => {
    const count = state.incomes.filter((i) => i.source === s.name).length;
    const msg = count
      ? `¿Eliminar «${s.name}»? Sus ${count} registros se quedan en tu historial, solo ya no aparecerá para registrar.`
      : `¿Eliminar «${s.name}»?`;
    if (!window.confirm(msg)) return;
    dispatch({ type: 'removeSource', name: s.name });
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 6 }}>Tipos de ingreso</div>
      <p className="muted small" style={{ marginBottom: 14 }}>Aparecen en tu cierre semanal y como etiquetas al registrar.</p>
      {list.map((s) => (
        <div key={s.name} className="list-row">
          <i style={{ width: 10, height: 10, borderRadius: 99, background: s.color, flex: 'none' }} />
          <div className="grow"><div style={{ fontWeight: 600 }}>{s.name}</div>{s.hint && <div className="faint small">{s.hint}</div>}</div>
          <button className="icon-btn" onClick={() => remove(s)} aria-label={`Eliminar ${s.name}`} style={{ color: 'var(--coral)' }}><Icon name="x" size={18} /></button>
        </div>
      ))}
      <div className="stack" style={{ marginTop: 16 }}>
        <label className="field"><span>Nuevo tipo</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Chapxile, Ventas, Beca" onKeyDown={(e) => e.key === 'Enter' && add()} /></label>
        <label className="field"><span>Descripción (opcional)</span><input value={hint} onChange={(e) => setHint(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /></label>
      </div>
      <button className="btn primary block" style={{ marginTop: 14 }} onClick={add} disabled={!name.trim()}>Agregar tipo</button>
    </Sheet>
  );
}

function SourceRow({ source, hint, color, value, onSave, last }) {
  const [v, setV] = useState(value ? String(Math.round(value)) : '');
  useEffect(() => setV(value ? String(Math.round(value)) : ''), [value]);
  const commit = () => {
    const n = Number(v) || 0;
    if (Math.round(n) !== Math.round(value || 0)) onSave(n);
  };
  return (
    <div className="between" style={{ padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <i style={{ width: 8, height: 8, borderRadius: 99, background: color, flex: 'none' }} />
        <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="ellipsis">{source}</div><div className="faint small ellipsis">{hint}</div></div>
      </div>
      <label className="row card2" style={{ gap: 6, padding: '0 12px', height: 44, width: 132, flex: 'none' }}>
        <span className="faint">$</span>
        <input className="num" inputMode="numeric" value={v} placeholder="0" onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} style={{ width: '100%', textAlign: 'right', fontSize: 18 }} aria-label={`Ingreso ${source}`} />
      </label>
    </div>
  );
}
