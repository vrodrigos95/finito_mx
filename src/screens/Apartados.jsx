import { useState } from 'react';
import { Bar, Empty, Header, Icon, Money, Sheet } from '../components/ui.jsx';
import { money, pct, sum } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

export default function Apartados({ back }) {
  const { state, dispatch, notify } = useStore();
  const [edit, setEdit] = useState(null);
  const total = sum(state.envelopes, (e) => e.saved);

  const aportar = (e) => {
    const amt = e.weekly || 100;
    dispatch({ type: 'envelopeAdd', id: e.id, amount: amt });
    const reached = e.saved + amt >= e.goal && e.saved < e.goal;
    notify(reached ? `¡Meta cumplida en ${e.name}!` : `+${money(amt)} a ${e.name}`, () => dispatch({ type: 'envelopeAdd', id: e.id, amount: -amt }));
  };

  return (
    <div className="screen">
      <Header title="Apartados" back={back} right={<button className="icon-btn" onClick={() => setEdit({})} aria-label="Nuevo apartado"><Icon name="plus" size={20} /></button>} />
      {state.envelopes.length === 0 ? (
        <Empty icon="env" color="var(--violet)" title="Tu primer sobre" text="Separa poquito cada semana para el carro o emergencias. $100 también cuentan." action="Crear apartado" onAction={() => setEdit({})} />
      ) : (
        <>
          <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>Llevas <b style={{ color: 'var(--text)' }}>{money(total)}</b> guardados. Poquito a poquito.</p>
          <div className="stack">
            {state.envelopes.map((e) => {
              const k = e.goal ? e.saved / e.goal : 0;
              const done = e.goal && e.saved >= e.goal;
              return (
                <div key={e.id} className="card">
                  <button className="between" style={{ width: '100%', textAlign: 'left' }} onClick={() => setEdit(e)}>
                    <div className="row">
                      <div className="menu-ico" style={{ color: 'var(--violet)' }}><Icon name="env" size={20} /></div>
                      <div><div style={{ fontWeight: 600 }}>{e.name}</div><div className="faint small">{e.hint}</div></div>
                    </div>
                    <span className={done ? 'lime' : 'muted'} style={{ fontWeight: 600 }}>{pct(Math.min(1, k))}</span>
                  </button>
                  <div className="row" style={{ alignItems: 'baseline', gap: 6, margin: '14px 0 10px' }}>
                    <Money value={e.saved} style={{ fontSize: 30 }} />
                    <span className="muted small">de {money(e.goal)}</span>
                  </div>
                  <Bar value={k} />
                  <div className="between" style={{ marginTop: 12 }}>
                    <span className="faint small">{e.weekly ? `${money(e.weekly)} cada semana` : 'Aporta cuando puedas'}</span>
                    <button className="btn secondary" style={{ height: 40 }} disabled={done} onClick={() => aportar(e)}>{done ? '¡Meta cumplida!' : `Aportar ${money(e.weekly || 100)}`}</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="faint small block">Los gastos con etiqueta «Carro» se descuentan de este sobre en lugar de tu presupuesto semanal.</p>
        </>
      )}
      {edit && <EnvelopeForm env={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EnvelopeForm({ env, onClose }) {
  const { dispatch, notify } = useStore();
  const [f, setF] = useState({ name: env?.name || '', hint: env?.hint || '', goal: env?.goal ?? '', weekly: env?.weekly ?? '', saved: env?.saved ?? 0 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const patch = { name: f.name.trim(), hint: f.hint, goal: Number(f.goal) || 0, weekly: Number(f.weekly) || 0, saved: Number(f.saved) || 0 };
    if (!patch.name) return notify('Ponle nombre');
    if (env) dispatch({ type: 'updateEnvelope', id: env.id, patch });
    else dispatch({ type: 'addEnvelope', envelope: patch });
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="h2" style={{ marginBottom: 16 }}>{env ? env.name : 'Nuevo apartado'}</div>
      <div className="stack">
        <label className="field"><span>Nombre</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Para qué</span><input value={f.hint} onChange={set('hint')} /></label>
        <div className="row">
          <label className="field grow"><span>Meta</span><input inputMode="numeric" value={f.goal} onChange={set('goal')} /></label>
          <label className="field grow"><span>Por semana</span><input inputMode="numeric" value={f.weekly} onChange={set('weekly')} /></label>
        </div>
        <label className="field"><span>Ya tienes guardado</span><input inputMode="numeric" value={f.saved} onChange={set('saved')} /></label>
      </div>
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save}>Guardar</button>
      {env && <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--coral)' }} onClick={() => { dispatch({ type: 'removeEnvelope', id: env.id }); onClose(); }}>Borrar apartado</button>}
    </Sheet>
  );
}
