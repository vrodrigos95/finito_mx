import { useMemo, useState } from 'react';
import { Empty, Header } from '../components/ui.jsx';
import { avgWeeklyIncome, monthOutflows, PRIORITIES, PRIORITY_COLOR, projectDebts, sourceColor, sourceNames, weekIncome, weeklyPlan } from '../lib/calc.js';
import { addDays, addMonths, fmtDayMonth, fmtMonthLong, fmtMonthYear, fmtShort, monthKey, today, weekStart } from '../lib/date.js';
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

      <WeeklySeparation />

      <MonthlyExpenses />

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

// ---------- Cuánto separar por semana ----------

const LEVELS = [
  ['minimo', 'Mínimo', 'Prioridad alta + gasolina y personal'],
  ['recomendado', 'Recomendado', 'Más prioridad media y tus ahorros'],
  ['completo', 'Todo', 'Cubre también la prioridad baja'],
];

function WeeklySeparation() {
  const { state, payments } = useStore();
  const plan = useMemo(() => weeklyPlan(state, payments), [state, payments]);
  const income = useMemo(() => avgWeeklyIncome(state), [state]);
  const [level, setLevel] = useState('recomendado');
  const [open, setOpen] = useState(null);
  const value = plan.levels[level];
  const diff = income - value;
  const overdueTotal = sum(plan.overdue, (p) => p.amount);
  const maxW = Math.max(1, ...plan.weeks.map((w) => w.total));
  const rows = [
    ...PRIORITIES.map(([k, l, , c]) => [`Pagos prioridad ${l.toLowerCase()}`, plan.avg[k], c, k === 'alta' || (k === 'media' && level !== 'minimo') || level === 'completo']),
    ['Gasolina y personal', plan.day2day, 'var(--lime)', true],
    ['Ahorros y apartados', plan.saving, 'var(--text2)', level !== 'minimo'],
  ];
  const week = open != null ? plan.weeks[open] : null;

  return (
    <div className="card block">
      <div className="h3">Cuánto separar por semana</div>
      <div className="faint small" style={{ marginTop: 2 }}>Próximas 4 semanas, según la prioridad de tus pagos y tu presupuesto.</div>
      <div className="row" style={{ gap: 6, marginTop: 14 }}>
        {LEVELS.map(([k, l]) => (
          <button key={k} className={`chip grow ${level === k ? 'on' : ''}`} style={{ padding: '0 6px', fontSize: 13 }} onClick={() => setLevel(k)}>{l}</button>
        ))}
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 14 }}>
        <span className="num" style={{ fontSize: 36 }}>{money(value)}</span>
        <span className="muted">por semana</span>
      </div>
      <div className="faint small">{LEVELS.find(([k]) => k === level)[2]} · {money(value / 7)} al día</div>

      <div style={{ marginTop: 12 }}>
        {rows.map(([label, v, c, on]) => (
          <div key={label} className="between small" style={{ padding: '7px 0', opacity: on ? 1 : 0.38 }}>
            <span className="row" style={{ gap: 8 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{label}</span>
            <span className="num">{money(v)}</span>
          </div>
        ))}
      </div>

      {income > 0 && (
        <div className="card2" style={{ padding: 12, marginTop: 10 }}>
          <div className="small">
            Ganas en promedio <b>{money(income)}</b> por semana.{' '}
            {diff >= 0
              ? <span className="lime">Te quedan {money(diff)} libres.</span>
              : <span className="coral">Te faltan {money(-diff)}: {level === 'minimo' ? 'cubre primero lo de prioridad alta.' : 'baja al nivel mínimo y pausa lo de prioridad baja.'}</span>}
          </div>
        </div>
      )}
      {overdueTotal > 0 && <p className="faint xs" style={{ marginTop: 8 }}>Incluye {money(overdueTotal)} de pagos atrasados repartidos en las 4 semanas.</p>}

      <div className="caps faint" style={{ marginTop: 16 }}>Pagos por semana</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'end', height: 120, marginTop: 10 }}>
        {plan.weeks.map((w, i) => (
          <button key={w.ws} onClick={() => setOpen(open === i ? null : i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} aria-label={`Semana del ${fmtDayMonth(w.ws)}: ${money(w.total)}`}>
            <span className="faint" style={{ fontSize: 11, marginBottom: 4 }}>{moneyK(w.total)}</span>
            <div className="grow-y" style={{ width: '70%', height: `${Math.max(2, (w.total / maxW) * 84)}px`, display: 'flex', flexDirection: 'column-reverse', gap: 2, outline: open === i ? '2px solid var(--text2)' : 'none', outlineOffset: 2, borderRadius: 5 }}>
              {PRIORITIES.filter(([k]) => w.by[k] > 0).map(([k]) => <i key={k} style={{ flex: w.by[k], background: PRIORITY_COLOR[k], borderRadius: 4, minHeight: 2 }} />)}
            </div>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 6 }}>
        {plan.weeks.map((w, i) => <span key={w.ws} className="faint" style={{ fontSize: 11, textAlign: 'center' }}>{i === 0 ? 'Esta' : fmtDayMonth(w.ws)}</span>)}
      </div>
      <div className="row xs faint" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {PRIORITIES.map(([k, l, , c]) => <span key={k} className="row" style={{ gap: 5 }}><i style={{ width: 7, height: 7, borderRadius: 2, background: c }} />{l}</span>)}
        <span>· Toca una semana para ver sus pagos</span>
      </div>
      {week && (
        <div className="small" style={{ marginTop: 10 }}>
          {week.items.length === 0 && <p className="faint">Sin pagos pendientes esa semana.</p>}
          {week.items.map((p) => (
            <div key={p.key} className="between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="row" style={{ gap: 8, minWidth: 0 }}><i style={{ width: 7, height: 7, borderRadius: 99, background: PRIORITY_COLOR[p.priority], flex: 'none' }} /><span className="ellipsis">{p.name} · {fmtShort(p.date)}</span></span>
              <span className="num">{money(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="faint xs" style={{ marginTop: 10 }}>Cambia la prioridad de un pago tocándolo en Pagos.</p>
    </div>
  );
}

// ---------- Gastos del mes: fijos y variables ----------

const FIXED_GROUPS = [
  ['fijos', 'Servicios y suscripciones', 'var(--cyan)'],
  ['deudas', 'Pagos de deudas', 'var(--coral)'],
  ['tanda', 'Tanda', 'var(--violet)'],
];

function MonthlyExpenses() {
  const { state, payments } = useStore();
  const cur = monthKey(today());
  const months = [addMonths(cur, -2), addMonths(cur, -1), cur, addMonths(cur, 1)];
  const [ym, setYm] = useState(cur);
  const [openGroup, setOpenGroup] = useState({ fijos: true });
  const [openCat, setOpenCat] = useState(null);
  const out = useMemo(() => monthOutflows(state, payments, ym), [state, payments, ym]);
  const prevOut = useMemo(() => monthOutflows(state, payments, addMonths(ym, -1)), [state, payments, ym]);
  const fixedTotal = out.fijosTotal + out.deudasTotal + out.tandaTotal;
  const future = ym > cur;
  // En un mes que no ha pasado, los variables se estiman con tu presupuesto semanal
  const estVariable = future ? ((state.settings.budgetGas || 0) + (state.settings.budgetPersonal || 0)) * 4.35 : 0;
  const varTotal = future ? estVariable : out.variablesTotal;
  const total = fixedTotal + varTotal;
  const pctF = total ? Math.round((fixedTotal / total) * 100) : 0;
  const catMax = out.byCat[0]?.[1] || 1;
  const days = ym === cur ? Number(today().slice(8)) : 30.4;
  const perWeek = out.variablesTotal / (days / 7);
  const varDelta = prevOut.variablesTotal ? out.variablesTotal / prevOut.variablesTotal - 1 : null;

  // Deudas agrupadas por nombre
  const debtRows = Object.values(out.deudas.reduce((m, p) => {
    const k = p.debtId || p.name;
    m[k] ??= { name: p.name.replace(/ · atrasado$/, ''), amount: 0, n: 0, paid: 0 };
    m[k].amount += p.amount; m[k].n++; if (p.paid) m[k].paid++;
    return m;
  }, {})).sort((a, b) => b.amount - a.amount);

  const places = useMemo(() => {
    const m = {};
    for (const e of out.variables) if (e.place) m[e.place] = (m[e.place] || 0) + e.amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [out.variables]);

  const groupItems = {
    fijos: out.fijos.map((p) => ({ key: p.key, label: `${p.name} · ${fmtDayMonth(p.date)}`, amount: p.amount, paid: p.paid })),
    deudas: debtRows.map((d) => ({ key: d.name, label: `${d.name}${d.n > 1 ? ` · ${d.n} pagos` : ''}`, amount: d.amount, paid: d.paid === d.n })),
    tanda: out.tanda.map((p) => ({ key: p.key, label: `Tanda · ${fmtDayMonth(p.date)}`, amount: p.amount, paid: p.paid })),
  };

  return (
    <div className="card block">
      <div className="h3">Tus gastos del mes</div>
      <div className="chips" style={{ margin: '12px -20px' }}>
        {months.map((m) => <button key={m} className={`chip ${ym === m ? 'on' : ''}`} onClick={() => { setYm(m); setOpenCat(null); }}>{fmtMonthLong(m).split(' ')[0]}{m > cur ? ' (plan)' : ''}</button>)}
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
        <span className="num" style={{ fontSize: 34 }}>{money(total)}</span>
        <span className="muted">{future ? 'estimado' : ym === cur ? 'en lo que va del mes' : 'en el mes'}</span>
      </div>

      <div style={{ display: 'flex', gap: 3, height: 12, borderRadius: 99, overflow: 'hidden', background: 'var(--line)', margin: '12px 0' }}>
        {fixedTotal > 0 && <i style={{ flex: fixedTotal, background: 'var(--coral)', transition: 'flex .25s var(--ease)' }} />}
        {varTotal > 0 && <i style={{ flex: varTotal, background: 'var(--lime)', transition: 'flex .25s var(--ease)' }} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card2" style={{ padding: 12 }}>
          <div className="small muted row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--coral)' }} />Fijos · {pctF}%</div>
          <div className="num" style={{ fontSize: 22 }}>{money(fixedTotal)}</div>
          <div className="faint xs">Se repiten cada mes</div>
        </div>
        <div className="card2" style={{ padding: 12 }}>
          <div className="small muted row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--lime)' }} />Variables · {total ? 100 - pctF : 0}%</div>
          <div className="num" style={{ fontSize: 22 }}>{money(varTotal)}</div>
          <div className="faint xs">{future ? 'Según tu presupuesto' : 'Lo que registras con el +'}</div>
        </div>
      </div>

      <div className="caps faint" style={{ marginTop: 20 }}>Gastos fijos</div>
      {FIXED_GROUPS.map(([k, label, c]) => {
        const items = groupItems[k];
        const t = out[`${k}Total`];
        const isOpen = !!openGroup[k];
        return (
          <div key={k} style={{ borderBottom: '1px solid var(--line)' }}>
            <button className="between" style={{ width: '100%', padding: '11px 0' }} onClick={() => setOpenGroup({ ...openGroup, [k]: !isOpen })} aria-expanded={isOpen}>
              <span className="row" style={{ gap: 10 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c }} /><span style={{ fontWeight: 600 }}>{label}</span><span className="faint xs">{items.length ? `${items.length} ${isOpen ? '▴' : '▾'}` : ''}</span></span>
              <span className="num">{money(t)}</span>
            </button>
            {isOpen && items.map((it) => (
              <div key={it.key} className="between small" style={{ padding: '0 0 8px 18px' }}>
                <span className={it.paid ? 'faint' : 'muted'}>{it.label}{it.paid ? ' · pagado' : ''}</span>
                <span className="num">{money(it.amount)}</span>
              </div>
            ))}
            {isOpen && !items.length && <p className="faint small" style={{ padding: '0 0 8px 18px' }}>Nada este mes.</p>}
          </div>
        );
      })}

      <div className="between" style={{ marginTop: 20 }}>
        <span className="caps faint">Gastos variables</span>
        {!future && varDelta != null && out.variablesTotal > 0 && (
          <span className={`xs ${varDelta > 0 ? 'coral' : 'lime'}`}>{varDelta > 0 ? '▲' : '▼'} {Math.abs(Math.round(varDelta * 100))}% vs {fmtMonthLong(addMonths(ym, -1)).split(' ')[0].toLowerCase()}</span>
        )}
      </div>
      {future ? (
        <p className="faint small" style={{ marginTop: 8 }}>Estimado con tu presupuesto de {money((state.settings.budgetGas || 0) + (state.settings.budgetPersonal || 0))} por semana (gasolina y personal).</p>
      ) : (
        <>
          {out.byCat.length === 0 && <p className="faint small" style={{ marginTop: 8 }}>Sin gastos registrados en {fmtMonthLong(ym).toLowerCase()}.</p>}
          {out.byCat.length > 0 && <div className="faint small" style={{ marginTop: 4 }}>Unos {money(perWeek)} por semana</div>}
          {out.byCat.map(([c, v]) => {
            const isOpen = openCat === c;
            const items = isOpen ? out.variables.filter((e) => e.category === c).sort((a, b) => b.amount - a.amount) : [];
            return (
              <div key={c + ym} style={{ marginTop: 12 }}>
                <button className="between small" style={{ width: '100%' }} onClick={() => setOpenCat(isOpen ? null : c)} aria-expanded={isOpen}>
                  <span>{c} <span className="faint xs">{isOpen ? '▴' : '▾'}</span></span>
                  <span className="num">{money(v)} <span className="faint xs">{Math.round((v / out.variablesTotal) * 100)}%</span></span>
                </button>
                <div className="bar violet thin" style={{ marginTop: 6 }}><i style={{ width: `${(v / catMax) * 100}%` }} /></div>
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    {items.slice(0, 12).map((e) => (
                      <div key={e.id} className="between xs" style={{ padding: '4px 0 4px 10px' }}>
                        <span className="muted ellipsis">{fmtDayMonth(e.date)} · {[e.note, e.place].filter(Boolean).join(' · ') || c}</span>
                        <span className="num">{money(e.amount)}</span>
                      </div>
                    ))}
                    {items.length > 12 && <div className="faint xs" style={{ paddingLeft: 10 }}>y {items.length - 12} más en Movimientos</div>}
                  </div>
                )}
              </div>
            );
          })}
          {places.length > 0 && (
            <>
              <div className="caps faint" style={{ marginTop: 20 }}>Dónde gastas más</div>
              {places.map(([p, v]) => (
                <div key={p} className="between small" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>{p}</span><span className="num">{money(v)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
      <p className="faint xs" style={{ marginTop: 12 }}>Fijos = servicios, deudas y tanda de tu calendario de pagos. Variables = lo que registras día a día.</p>
    </div>
  );
}
