import { useEffect, useState } from 'react';
import Registrar from './components/Registrar.jsx';
import { Icon, Toast } from './components/ui.jsx';
import { StoreProvider } from './lib/store.jsx';
import Apartados from './screens/Apartados.jsx';
import Deudas, { DebtDetail } from './screens/Deudas.jsx';
import Home from './screens/Home.jsx';
import Ingresos from './screens/Ingresos.jsx';
import Mas, { Ajustes } from './screens/Mas.jsx';
import Movimientos from './screens/Movimientos.jsx';
import Pagos from './screens/Pagos.jsx';
import Stats from './screens/Stats.jsx';

const TAB_OF = { inicio: 'inicio', pagos: 'pagos', deudas: 'deudas', deuda: 'deudas', mas: 'mas', ingresos: 'mas', apartados: 'mas', stats: 'mas', ajustes: 'mas', movimientos: 'mas' };

function Shell() {
  const [route, setRoute] = useState({ name: 'inicio' });
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(false);

  const go = (name, params = {}) => {
    setStack((s) => (TAB_OF[name] === name ? [] : [...s, route]));
    setRoute({ name, ...params });
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setStack((s) => {
      const prev = s.at(-1) || { name: TAB_OF[route.name] };
      setRoute(prev);
      return s.slice(0, -1);
    });
    window.scrollTo({ top: 0 });
  };
  const tab = (name) => { setStack([]); setRoute({ name }); window.scrollTo({ top: 0 }); };

  useEffect(() => {
    const h = (e) => { if (e.key === 'n' && !sheet && !/input|select|textarea/i.test(document.activeElement?.tagName)) setSheet(true); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sheet]);

  const r = route.name;
  let screen;
  if (r === 'inicio') screen = <Home go={go} />;
  else if (r === 'pagos') screen = <Pagos />;
  else if (r === 'deudas') screen = <Deudas go={go} openDebt={(id) => go('deuda', { id })} />;
  else if (r === 'deuda') screen = <DebtDetail id={route.id} back={back} />;
  else if (r === 'mas') screen = <Mas go={go} />;
  else if (r === 'ingresos') screen = <Ingresos back={back} />;
  else if (r === 'apartados') screen = <Apartados back={back} />;
  else if (r === 'stats') screen = <Stats back={back} go={go} />;
  else if (r === 'ajustes') screen = <Ajustes back={back} />;
  else if (r === 'movimientos') screen = <Movimientos back={back} />;

  const active = TAB_OF[r];
  const NavBtn = ({ id, icon, label }) => (
    <button className={active === id ? 'on' : ''} onClick={() => tab(id)} aria-current={active === id ? 'page' : undefined}>
      <Icon name={icon} size={22} />{label}
    </button>
  );

  return (
    <div className="app">
      <div key={r + (route.id || '')}>{screen}</div>
      <nav className="nav" aria-label="Principal">
        <NavBtn id="inicio" icon="home" label="Inicio" />
        <NavBtn id="pagos" icon="cal" label="Pagos" />
        <button className="fab" onClick={() => setSheet(true)} aria-label="Registrar"><Icon name="plus" size={28} /></button>
        <NavBtn id="deudas" icon="card" label="Deudas" />
        <NavBtn id="mas" icon="more" label="Más" />
      </nav>
      {sheet && <Registrar onClose={() => setSheet(false)} />}
      <Toast />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
