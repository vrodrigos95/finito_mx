import { useState } from 'react';
import { Bar, Confetti, Empty, Header, Icon, Money, Sheet, useConfetti } from '../components/ui.jsx';
import { savingNeeded, savingProjection, savingRhythm } from '../lib/calc.js';
import { addDays, fmtDayMonth, fmtLong, fmtMonthYear, fmtShort, today } from '../lib/date.js';
import { money, pct, sum } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

const uid = () => Math.random().toString(36).slice(2, 10);

// Texto corto de cuánto falta: «12 semanas» o «8 meses»
export const howLong = (weeks) => {
  if (weeks == null) return null;
  if (weeks <= 0) return 'ya';
  if (weeks < 9) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  const m = Math.round(weeks / 4.35);
  if (m < 24) return `${m} meses`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return `${y} ${y === 1 ? 'año' : 'años'}${r ? ` y ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`;
};

// El ritmo que manda la proyección: lo que planeaste por semana; si no, tu ritmo real
const pace = (g) => g.weekly || savingRhythm(g);

export default function Ahorros({ back }) {
  const { state, dispatch, notify } = useStore();
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confetti, fire] = useConfetti();
  const goals = state.savings || [];
  const total = sum(goals, (g) => g.saved);
  const weekly = sum(goals.filter((g) => !g.goal || g.saved < g.goal), (g) => g.weekly || 0);

  const move = (g, amount) => {
    if (!amount) return;
    const moveId = uid();
    dispatch({ type: 'savingMove', id: g.id, amount, moveId });
    const reached = amount > 0 && g.goal && g.saved < g.goal && g.saved + amount >= g.goal;
    if (reached) fire();
    notify(reached ? `¡Llegaste a tu meta de ${g.name}!` : amount > 0 ? `+${money(amount)} a ${g.name}` : `Sacaste ${money(-amount)} de ${g.name}`,
      () => dispatch({ type: 'savingUndo', id: g.id, moveId }));
  };

  const open = detail && goals.find((g) => g.id === detail);

  return (
    <div className="screen">
      <Confetti show={confetti} />
      <Header title="Ahorros" back={back} right={<button className="icon-btn" onClick={() => setEdit({})} aria-label="Nueva meta de ahorro"><Icon name="plus" size={20} /></button>} />
      {goals.length === 0 ? (
        <Empty icon="target" color="var(--lime)" title="Ponle meta a tu ahorro" text="Elige cuánto quieres juntar y cuánto puedes guardar por semana. Te decimos cuándo llegas." action="Crear meta" onAction={() => setEdit({})} />
      ) : (
        <>
          <div className="card">
            <div className="muted">Llevas ahorrado</div>
            <Money value={total} style={{ fontSize: 44, display: 'block', margin: '2px 0 6px' }} />
            <div className="faint small">{weekly ? `Planeas guardar ${money(weekly)} por semana (${money(weekly * 4.35)} al mes).` : 'Ponle un monto por semana a tus metas para ver cuándo llegas.'}</div>
          </div>
          <div className="stack block">
            {goals.map((g) => {
              const k = g.goal ? Math.min(1, g.saved / g.goal) : 0;
              const done = g.goal && g.saved >= g.goal;
              const p = pace(g);
              const proj = savingProjection(g, p);
              const need = savingNeeded(g);
              return (
                <div key={g.id} className="card">
                  <button className="between" style={{ width: '100%', textAlign: 'left' }} onClick={() => setDetail(g.id)}>
                    <div className="row" style={{ minWidth: 0 }}>
                      <div className="menu-ico" style={{ color: 'var(--lime)' }}><Icon name="target" size={20} /></div>
                      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="ellipsis">{g.name}</div><div className="faint small ellipsis">{g.hint || (g.target ? `Para el ${fmtShort(g.target).toLowerCase()}` : 'Sin fecha')}</div></div>
                    </div>
                    <span className={done ? 'lime' : 'muted'} style={{ fontWeight: 600 }}>{pct(k)}</span>
                  </button>
                  <div className="row" style={{ alignItems: 'baseline', gap: 6, margin: '14px 0 10px' }}>
                    <Money value={g.saved} style={{ fontSize: 30 }} />
                    <span className="muted small">de {money(g.goal)}</span>
                  </div>
                  <Bar value={k} />
                  <div className="small" style={{ marginTop: 10 }}>
                    {done ? <span className="lime">¡Meta cumplida!</span>
                      : proj.weeks != null ? <span>Llegas en <b className="lime">{howLong(proj.weeks)}</b> <span className="muted">· {fmtMonthYear(proj.date.slice(0, 7))} con {money(p)}/semana{!g.weekly ? ' (tu ritmo real)' : ''}</span></span>
                      : <span className="muted">Ponle un monto por semana para ver cuándo llegas.</span>}
                  </div>
                  {need && !done && (
                    <div className={`xs ${need.past ? 'coral' : g.weekly && g.weekly + 0.5 < need.perWeek ? 'coral' : 'faint'}`} style={{ marginTop: 4 }}>
                      {need.past ? 'Ya pasó la fecha que pusiste.' : `Para llegar el ${fmtDayMonth(g.target)} necesitas ${money(need.perWeek)} por semana.`}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 12, gap: 8 }}>
                    <button className="btn secondary grow" style={{ height: 40 }} onClick={() => setDetail(g.id)}>Ver proyección</button>
                    <button className="btn primary grow" style={{ height: 40 }} disabled={done} onClick={() => move(g, g.weekly || 100)}>Aportar {money(g.weekly || 100)}</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="faint small block">Tus aportaciones por semana se suman a «Cuánto separar» en Inicio y en Estadísticas.</p>
        </>
      )}
      {edit && <SavingForm goal={edit.id ? edit : null} onClose={() => setEdit(null)} />}
      {open && <SavingDetail g={open} onClose={() => setDetail(null)} onMove={(a) => move(open, a)} onEdit={() => { setDetail(null); setEdit(open); }} />}
    </div>
  );
}

function SavingDetail({ g, onClose, onMove, onEdit }) {
  const real = savingRhythm(g);
  const left = Math.max(0, g.goal - g.saved);
  const maxSim = Math.max(500, Math.ceil(Math.max(left / 4, (g.weekly || 0) * 2, 1000) / 100) * 100);
  const [sim, setSim] = useState(Math.min(maxSim, g.weekly || Math.round(real / 50) * 50 || 200));
  const [other, setOther] = useState('');
  const proj = savingProjection(g, sim);
  const need = savingNeeded(g);
  const history = [...(g.history || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const amt = Number(other) || 0;

  return (
    <Sheet onClose={onClose}>
      <div className="between">
        <div className="h2 ellipsis">{g.name}</div>
        <button className="icon-btn" onClick={onEdit} aria-label="Editar meta"><Icon name="edit" size={18} /></button>
      </div>
      <div className="muted small" style={{ marginBottom: 12 }}>{money(g.saved)} de {money(g.goal)} · te faltan {money(left)}</div>

      {left > 0 ? (
        <>
          <div className="muted small">Si guardas por semana</div>
          <Money value={sim} style={{ fontSize: 34, display: 'block', margin: '4px 0 8px', color: 'var(--lime)' }} duration={150} />
          <input type="range" min={50} max={maxSim} step={50} value={Math.min(sim, maxSim)} onChange={(e) => setSim(Number(e.target.value))} aria-label="Ahorro por semana" />
          <div className="card2" style={{ padding: 14, marginTop: 12 }}>
            <div className="small">Llegas en <b className="lime">{howLong(proj.weeks)}</b>, el <b>{fmtLong(proj.date).toLowerCase()}</b>.</div>
            <div className="faint xs" style={{ marginTop: 4 }}>
              {real > 0 ? `Tu ritmo real de las últimas semanas: ${money(real)} por semana.` : 'Aún no hay aportaciones para calcular tu ritmo real.'}
              {need && !need.past ? ` Para tu fecha (${fmtDayMonth(g.target)}): ${money(need.perWeek)} por semana.` : ''}
            </div>
          </div>
          <GrowthChart g={g} weekly={sim} weeks={proj.weeks} />
        </>
      ) : <p className="lime" style={{ margin: '8px 0 12px' }}>¡Meta cumplida! Puedes subirla o crear otra.</p>}

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <input inputMode="decimal" className="grow" style={{ height: 46, padding: '0 14px', borderRadius: 14, background: 'var(--card2)', border: '1px solid var(--line)' }} placeholder="Otro monto" value={other} onChange={(e) => setOther(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Monto" />
        <button className="btn secondary" style={{ height: 46 }} disabled={!amt || amt > g.saved} onClick={() => { onMove(-amt); setOther(''); }}>Sacar</button>
        <button className="btn primary" style={{ height: 46 }} disabled={!amt} onClick={() => { onMove(amt); setOther(''); }}>Aportar</button>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="caps faint" style={{ marginBottom: 6 }}>Historial</div>
          {history.slice(0, 8).map((h) => (
            <div key={h.id} className="between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="muted">{fmtShort(h.date)}</span>
              <span className={`num ${h.amount > 0 ? 'lime' : 'coral'}`}>{h.amount > 0 ? '+' : '−'}{money(Math.abs(h.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// Línea de cómo crece tu ahorro semana a semana hasta la meta
function GrowthChart({ g, weekly, weeks }) {
  if (!weeks || weeks < 2) return null;
  const W = 340, H = 120, pad = 8;
  const n = Math.min(weeks, 260);
  const pts = Array.from({ length: n + 1 }, (_, i) => Math.min(g.goal, g.saved + weekly * i));
  const x = (i) => pad + (i / n) * (W - pad * 2);
  const y = (v) => pad + (1 - v / g.goal) * (H - pad * 2);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const mid = Math.floor(n / 2);
  return (
    <div style={{ marginTop: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Proyección de tu ahorro">
        <line x1={pad} x2={W - pad} y1={y(g.goal)} y2={y(g.goal)} stroke="var(--line)" strokeDasharray="4 4" />
        <path d={`${d} L${x(n)},${H - pad} L${pad},${H - pad} Z`} fill="rgba(200,241,105,.08)" />
        <path d={d} fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round" className="draw" />
        <circle cx={x(n)} cy={y(g.goal)} r="5" fill="var(--lime)" />
      </svg>
      <div className="between faint xs" style={{ marginTop: 2 }}>
        <span>Hoy · {money(g.saved)}</span>
        <span>{fmtDayMonth(addDays(today(), mid * 7))}</span>
        <span>{fmtMonthYear(addDays(today(), n * 7).slice(0, 7))} · {money(g.goal)}</span>
      </div>
    </div>
  );
}

function SavingForm({ goal, onClose }) {
  const { dispatch, notify } = useStore();
  const [f, setF] = useState({ name: goal?.name || '', hint: goal?.hint || '', goal: goal?.goal ?? '', weekly: goal?.weekly ?? '', saved: goal?.saved ?? '', target: goal?.target || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const preview = savingProjection({ goal: Number(f.goal) || 0, saved: Number(f.saved) || 0 }, Number(f.weekly) || 0);
  const save = () => {
    const patch = { name: f.name.trim(), hint: f.hint.trim(), goal: Number(f.goal) || 0, weekly: Number(f.weekly) || 0, target: f.target };
    if (!patch.name) return notify('Ponle nombre');
    if (!patch.goal) return notify('Pon cuánto quieres juntar');
    const saved = Number(f.saved) || 0;
    if (goal) dispatch({ type: 'updateSaving', id: goal.id, patch: { ...patch, saved } });
    else dispatch({ type: 'addSaving', saving: { ...patch, saved, history: saved ? [{ id: uid(), date: today(), amount: saved, initial: true }] : [] } });
    notify(goal ? 'Meta actualizada' : 'Meta creada');
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 16 }}>{goal ? 'Editar meta' : 'Nueva meta de ahorro'}</div>
      <div className="stack">
        <label className="field"><span>Nombre</span><input value={f.name} onChange={set('name')} placeholder="Ej. Fondo de emergencia, viaje, enganche…" /></label>
        <label className="field"><span>Para qué (opcional)</span><input value={f.hint} onChange={set('hint')} /></label>
        <div className="row">
          <label className="field grow"><span>Meta</span><input inputMode="decimal" value={f.goal} onChange={set('goal')} placeholder="Ej. 10000" /></label>
          <label className="field grow"><span>Por semana</span><input inputMode="decimal" value={f.weekly} onChange={set('weekly')} placeholder="Ej. 250" /></label>
        </div>
        <div className="row">
          <label className="field grow"><span>Ya tienes</span><input inputMode="decimal" value={f.saved} onChange={set('saved')} placeholder="0" /></label>
          <label className="field grow"><span>Fecha meta (opcional)</span><input type="date" value={f.target} min={today()} onChange={set('target')} /></label>
        </div>
        {preview.weeks != null && !preview.done && (
          <p className="small">Con {money(Number(f.weekly))} por semana llegas en <b className="lime">{howLong(preview.weeks)}</b> ({fmtShort(preview.date).toLowerCase()}).</p>
        )}
      </div>
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save}>Guardar</button>
      {goal && <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--coral)' }} onClick={() => { if (window.confirm(`¿Borrar la meta ${goal.name}?`)) { dispatch({ type: 'removeSaving', id: goal.id }); onClose(); } }}>Borrar meta</button>}
    </Sheet>
  );
}
