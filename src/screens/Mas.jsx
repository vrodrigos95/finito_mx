import { useRef } from 'react';
import { Header, Icon } from '../components/ui.jsx';
import { exportBackup, resetToSeed, useStore } from '../lib/store.jsx';

export default function Mas({ go }) {
  const items = [
    ['ingresos', 'trend', 'Ingresos semanales', 'Cierra tu semana por plataforma', 'var(--lime)'],
    ['apartados', 'env', 'Apartados', 'Carro, emergencia y tus sobres', 'var(--violet)'],
    ['stats', 'bars', 'Estadísticas', 'En qué ganas, en qué gastas y cuándo quedas libre', 'var(--cyan)'],
    ['ajustes', 'gear', 'Ajustes y respaldo', 'Presupuestos, meta y copia de tus datos', 'var(--text2)'],
  ];
  return (
    <div className="screen">
      <Header title="Más" />
      {items.map(([k, ico, t, s, c]) => (
        <button key={k} className="menu-row" onClick={() => go(k)}>
          <div className="menu-ico" style={{ color: c }}><Icon name={ico} size={20} /></div>
          <div className="grow"><div style={{ fontWeight: 600 }}>{t}</div><div className="faint small">{s}</div></div>
          <Icon name="next" size={18} />
        </button>
      ))}
    </div>
  );
}

export function Ajustes({ back }) {
  const { state, dispatch, notify } = useStore();
  const file = useRef();
  const s = state.settings;
  const num = (k) => ({
    value: s[k],
    inputMode: 'numeric',
    onChange: (e) => dispatch({ type: 'settings', patch: { [k]: Number(e.target.value.replace(/\D/g, '')) || 0 } }),
  });
  const importFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.debts || !data.schedules) throw new Error('formato');
      dispatch({ type: 'replace', state: data });
      notify('Respaldo cargado');
    } catch {
      notify('Ese archivo no es un respaldo de Finito');
    }
    e.target.value = '';
  };
  return (
    <div className="screen">
      <Header title="Ajustes" back={back} />
      <div className="card stack">
        <label className="field"><span>Tu nombre</span><input value={s.name} onChange={(e) => dispatch({ type: 'settings', patch: { name: e.target.value } })} /></label>
        <div className="row">
          <label className="field grow"><span>Gasolina por semana</span><input {...num('budgetGas')} /></label>
          <label className="field grow"><span>Personal por semana</span><input {...num('budgetPersonal')} /></label>
        </div>
        <label className="field"><span>Meta de ingreso por semana</span><input {...num('incomeGoalWeek')} /></label>
        <label className="field"><span>Presupuesto mensual para deudas (bola de nieve)</span><input {...num('debtBudgetMonthly')} /></label>
        <label className="field"><span>La bola de nieve empieza en</span><input type="month" value={s.snowballStart} onChange={(e) => e.target.value && dispatch({ type: 'settings', patch: { snowballStart: e.target.value } })} /></label>
      </div>

      <div className="block">
        <div className="caps faint" style={{ marginBottom: 10 }}>Tus datos</div>
        <p className="muted small" style={{ marginBottom: 12 }}>Todo se guarda solo en este teléfono. Descarga un respaldo cada semana por si cambias de celular o se borra Safari.</p>
        <button className="menu-row" onClick={() => exportBackup(state)}>
          <div className="menu-ico lime"><Icon name="save" size={20} /></div>
          <div className="grow" style={{ fontWeight: 600 }}>Descargar respaldo</div>
        </button>
        <button className="menu-row" onClick={() => file.current?.click()}>
          <div className="menu-ico violet"><Icon name="trend" size={20} /></div>
          <div className="grow" style={{ fontWeight: 600 }}>Cargar respaldo</div>
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={importFile} />
        <button className="menu-row" onClick={() => {
          if (window.confirm('¿Regresar a los datos iniciales? Se borra lo que registraste.')) { dispatch({ type: 'replace', state: resetToSeed() }); notify('Datos reiniciados'); }
        }}>
          <div className="menu-ico coral"><Icon name="x" size={20} /></div>
          <div className="grow" style={{ fontWeight: 600 }}>Reiniciar datos</div>
        </button>
      </div>
      <p className="faint xs block" style={{ textAlign: 'center' }}>Finito · v0.2</p>
    </div>
  );
}
