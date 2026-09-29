import { useMemo, useState } from 'react';
import { Empty, Header } from '../components/ui.jsx';
import { monthOutflows, projectDebts, sourceColor, sourceNames, weekIncome } from '../lib/calc.js';
import { addDays, addMonths, fmtDayMonth, fmtMonthLong, fmtMonthYear, monthKey, today, weekStart } from '../lib/date.js';
import { money, moneyK, sum } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

export default function Stats({ back, go }) {
  const { state, payments } = useStore();
  const ws0 = weekStart(today());
  const weeks = useMemo(() => Array.from({ length: 8 }, (_, i) => weekIncome(state, addDays(ws0, -7 * (7 - i)))), [state, ws0]);
  const allNames = sourceNames(state, weeks.flatMap((w) => w.items));
  const bySrc = Object.fromEntries(allNames.map((s) => [s, sum(weeks, (w) => w.bySource[s] || 0)]));
  const maxW = Math.max(1, ...weeks.map((w) => w.total));
  const closedWeeks = weeks.slice(0, 7).filter((w) => w.total > 0);
  const avgW = closedWeeks.length ? sum(closedWeeks, (w) => w.total) / closedWeeks.length : 0;

  const months = [monthKey(today()), addMonths(monthKey(today()), -1), addMonths(monthKey(today()), -2)];
  const [ym, setYm] = useState(months[0]);
  const cats = useMemo(() => {
    const m = {};
    for (const e of state.expenses) if (monthKey(e.date) === ym) m[e.category] = (m[e.category] || 0) + e.amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [state.expenses, ym]);
  const catMax = cats[0]?.[1] || 1;

  const out = useMemo(() => monthOutflows(state, payments, ym), [state, payments, ym]);
  const proj = useMemo(() => projectDebts(state, payments), [state, payments]);
  const withHours = Object.entries(state.weekMeta).filter(([, m]) => m.horas > 0);
  const perHour = withHours.length
    ? sum(withHours, ([ws]) => { const w = weekIncome(state, ws); return (w.bySource.Uber || 0) + (w.bySource.Didi || 0); }) / sum(withHours, ([, m]) => m.horas)
    : null;

  if (!state.incomes.length && !state.expenses.length) {
    return <div className="screen"><Header title="Estadísticas" back={back} /><Empty icon="bars" color="var(--violet)" title="Dale dos semanas" text="Con dos cierres de semana te mostramos tus ingresos por app y cuándo quedas libre." action="Ir a ingresos" onAction={() => go('ingresos')} /></div>;
  }

  return (
    <div className="screen">
      <Header title="Estadísticas" back={back} />
      <div className="card">
        <div className="between"><span className="h3">Ingresos por semana</span><span className="faint small">8 semanas</span></div>
        <div className="faint small" style={{ marginTop: 2 }}>Promedio {money(avgW)} por semana registrada</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, alignItems: 'end', height: 170, marginTop: 14 }}>
          {weeks.map((w, i) => (
            <div key={w.ws} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span className="faint" style={{ fontSize: 10, marginBottom: 4 }}>{w.total ? moneyK(w.total) : ''}</span>
              <div className="grow-y" style={{ width: '100%', height: `${(w.total / maxW) * 130}px`, display: 'flex', flexDirection: 'column-reverse', gap: 2, animationDelay: `${i * 40}ms`, opacity: w.ws === ws0 ? 0.55 : 1 }}>
                {w.names.filter((s) => w.bySource[s] > 0).map((s) => (
                  <i key={s} style={{ flex: w.bySource[s], background: sourceColor(state, s), borderRadius: 4, minHeight: 2 }} title={`${s}: ${money(w.bySource[s])}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginTop: 6 }}>
          {weeks.map((w) => <span key={w.ws} className="faint" style={{ fontSize: 10, textAlign: 'center' }}>{fmtDayMonth(w.ws)}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 14 }}>
          {allNames.filter((s) => bySrc[s] > 0).map((s) => (
            <div key={s} className="between small">
              <span className="row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: sourceColor(state, s) }} /><span className="muted">{s}</span></span>
              <span className="num">{money(bySrc[s])}</span>
            </div>
          ))}
        </div>
        {perHour != null && <div className="small muted" style={{ marginTop: 12 }}>En promedio ganas <b className="lime">{money(perHour)}</b> por hora en plataformas.</div>}
      </div>

      <div className="card block">
        <div className="between"><span className="h3">Gastos por categoría</span><span className="num">{money(sum(cats, (c) => c[1]))}</span></div>
        <div className="chips" style={{ margin: '12px -20px' }}>
          {months.map((m) => <button key={m} className={`chip ${ym === m ? 'on' : ''}`} onClick={() => setYm(m)}>{fmtMonthLong(m).split(' ')[0]}</button>)}
        </div>
        {cats.length === 0 && <p className="faint small">Sin gastos registrados en {fmtMonthLong(ym).toLowerCase()}.</p>}
        {cats.map(([c, v]) => (
          <div key={c + ym} style={{ marginTop: 12 }}>
            <div className="between small"><span>{c}</span><span className="num">{money(v)}</span></div>
            <div className="bar violet thin" style={{ marginTop: 6 }}><i style={{ width: `${(v / catMax) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      <FixedVsVariable out={out} ym={ym} />

      <div className="card block">
        <div className="h3">Proyección de tu deuda</div>
        <div className="faint small">{proj.freedom ? `Si sigues el plan, quedas libre en ${fmtMonthLong(proj.freedom).toLowerCase()}.` : 'Con el presupuesto actual no se alcanza a liquidar todo.'} Sin intereses de las deudas sin tasa.</div>
        <Projection series={proj.series} />
      </div>
    </div>
  );
}

function Projection({ series }) {
  if (series.length < 2) return null;
  const W = 340, H = 150, pad = 8;
  const max = Math.max(...series.map((s) => s.total));
  const x = (i) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - v / max) * (H - pad * 2);
  const d = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.total).toFixed(1)}`).join(' ');
  const last = series.length - 1;
  const ticks = [0, Math.floor(last / 2), last];
  return (
    <div style={{ marginTop: 14 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Proyección del saldo total de deuda">
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--line)" />
        <path d={`${d} L${x(last)},${H - pad} L${pad},${H - pad} Z`} fill="rgba(200,241,105,.08)" />
        <path d={d} fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round" className="draw" />
        <circle cx={x(last)} cy={y(series[last].total)} r="6" fill="var(--lime)" />
      </svg>
      <div className="between faint xs" style={{ marginTop: 4 }}>
        {ticks.map((i) => <span key={i}>{fmtMonthYear(series[i].ym)}{i === 0 ? ` · ${moneyK(series[0].total)}` : ''}</span>)}
      </div>
    </div>
  );
}

const PARTS = [
  ['fijosTotal', 'Fijos', 'Servicios y suscripciones', 'var(--cyan)'],
  ['deudasTotal', 'Pagos de deudas', 'Lo programado del mes', 'var(--coral)'],
  ['tandaTotal', 'Tanda', 'Aportaciones', 'var(--violet)'],
  ['variablesTotal', 'Variables', 'Lo que registras día a día', 'var(--lime)'],
];

function FixedVsVariable({ out, ym }) {
  const total = PARTS.reduce((s, [k]) => s + out[k], 0);
  const fixedAll = out.fijosTotal + out.deudasTotal + out.tandaTotal;
  const [open, setOpen] = useState(false);
  return (
    <div className="card block">
      <div className="between"><span className="h3">Gastos fijos y variables</span><span className="num">{money(total)}</span></div>
      <div className="faint small" style={{ marginTop: 2 }}>{fmtMonthLong(ym)} · fijos {total ? Math.round((fixedAll / total) * 100) : 0}% · variables {total ? Math.round((out.variablesTotal / total) * 100) : 0}%</div>
      <div style={{ display: 'flex', gap: 3, height: 12, borderRadius: 99, overflow: 'hidden', background: 'var(--line)', margin: '14px 0 6px' }}>
        {PARTS.filter(([k]) => out[k] > 0).map(([k, , , c]) => <i key={k} style={{ flex: out[k], background: c, transition: 'flex .25s var(--ease)' }} />)}
      </div>
      {PARTS.map(([k, label, hint, c]) => (
        <div key={k} className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <span className="row" style={{ gap: 10 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c }} /><span><span style={{ fontWeight: 600 }}>{label}</span><br /><span className="faint xs">{hint}</span></span></span>
          <span className="num">{money(out[k])}</span>
        </div>
      ))}
      <button className="btn ghost" style={{ paddingLeft: 0, marginTop: 6 }} onClick={() => setOpen(!open)}>{open ? 'Ocultar detalle de fijos' : 'Ver detalle de fijos'}</button>
      {open && (
        <div className="small">
          {[...out.fijos, ...out.tanda].map((p) => (
            <div key={p.key} className="between" style={{ padding: '6px 0' }}>
              <span className={p.paid ? 'faint' : ''}>{p.name} · {fmtDayMonth(p.date)}{p.paid ? ' · pagado' : ''}</span><span className="num">{money(p.amount)}</span>
            </div>
          ))}
          {!out.fijos.length && !out.tanda.length && <p className="faint">Sin fijos este mes.</p>}
        </div>
      )}
      <p className="faint xs" style={{ marginTop: 10 }}>Fijos, deudas y tanda salen de tu calendario de pagos; variables, de lo que registras con el +.</p>
    </div>
  );
}
