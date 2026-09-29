import { useEffect, useState } from 'react';
import { Header, Icon, Money } from '../components/ui.jsx';
import { SOURCES, weekIncome } from '../lib/calc.js';
import { addDays, fmtDayMonth, today, weekStart } from '../lib/date.js';
import { money } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

export const SOURCE_COLOR = { Uber: 'var(--lime)', Didi: 'var(--violet)', P5: 'var(--cyan)', 'Asesorías': 'var(--gray)', Otro: '#3a3f4a' };
const HINT = { Uber: 'Plataforma', Didi: 'Plataforma', P5: 'Quincena de la prepa', 'Asesorías': 'Clases particulares', Otro: 'Lo demás' };

export default function Ingresos({ back }) {
  const { state, dispatch, notify } = useStore();
  const [ws, setWs] = useState(weekStart(today()));
  const inc = weekIncome(state, ws);
  const goal = state.settings.incomeGoalWeek;
  const meta = state.weekMeta[ws] || {};
  const horas = meta.horas || 0;
  const plat = inc.bySource.Uber + inc.bySource.Didi;
  const isCurrent = ws === weekStart(today());

  return (
    <div className="screen">
      <Header title="Ingresos" back={back} right={
        <div className="row card2" style={{ gap: 2, padding: 4, borderRadius: 99 }}>
          <button className="icon-btn" style={{ width: 34, height: 34, background: 'none' }} onClick={() => setWs(addDays(ws, -7))} aria-label="Semana anterior"><Icon name="back" size={16} /></button>
          <span className="small" style={{ fontWeight: 600, minWidth: 92, textAlign: 'center' }}>{ws.slice(5, 7) === inc.we.slice(5, 7) ? fmtDayMonth(ws).split(' ')[0] : fmtDayMonth(ws)}–{fmtDayMonth(inc.we)}</span>
          <button className="icon-btn" style={{ width: 34, height: 34, background: 'none', opacity: isCurrent ? 0.3 : 1 }} disabled={isCurrent} onClick={() => setWs(addDays(ws, 7))} aria-label="Semana siguiente"><Icon name="next" size={16} /></button>
        </div>
      } />

      <div className="card">
        <div className="muted">{meta.closed ? 'Cerraste la semana con' : isCurrent ? 'Llevas esta semana' : 'Esa semana hiciste'}</div>
        <Money value={inc.total} style={{ fontSize: 44, display: 'block', margin: '2px 0 12px' }} />
        <div style={{ display: 'flex', gap: 3, height: 10, borderRadius: 99, overflow: 'hidden', background: 'var(--line)' }}>
          {SOURCES.filter((s) => inc.bySource[s] > 0).map((s) => (
            <i key={s} style={{ flex: inc.bySource[s], background: SOURCE_COLOR[s], transition: 'flex .25s var(--ease)' }} />
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          {inc.total >= goal
            ? <span className="chip on" style={{ display: 'inline-flex', alignItems: 'center', height: 30, fontSize: 13 }}>+{money(inc.total - goal)} arriba de tu meta de {money(goal)}</span>
            : <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', height: 30, fontSize: 13 }}>Faltan {money(goal - inc.total)} para tu meta de {money(goal)}</span>}
        </div>
      </div>

      <div className="card block" style={{ padding: '6px 16px' }}>
        {SOURCES.map((s, i) => (
          <SourceRow key={s + ws} source={s} value={inc.bySource[s]} last={i === SOURCES.length - 1}
            onSave={(v) => { dispatch({ type: 'setWeekSource', ws, we: inc.we, source: s, amount: v }); }} />
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
    </div>
  );
}

function SourceRow({ source, value, onSave, last }) {
  const [v, setV] = useState(value ? String(Math.round(value)) : '');
  useEffect(() => setV(value ? String(Math.round(value)) : ''), [value]);
  const commit = () => {
    const n = Number(v) || 0;
    if (Math.round(n) !== Math.round(value)) onSave(n);
  };
  return (
    <div className="between" style={{ padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <div className="row" style={{ gap: 10 }}>
        <i style={{ width: 8, height: 8, borderRadius: 99, background: SOURCE_COLOR[source] }} />
        <div><div style={{ fontWeight: 600 }}>{source}</div><div className="faint small">{HINT[source]}</div></div>
      </div>
      <label className="row card2" style={{ gap: 6, padding: '0 12px', height: 44, width: 132 }}>
        <span className="faint">$</span>
        <input className="num" inputMode="numeric" value={v} placeholder="0" onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} style={{ width: '100%', textAlign: 'right', fontSize: 18 }} aria-label={`Ingreso ${source}`} />
      </label>
    </div>
  );
}
