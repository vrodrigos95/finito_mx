import { useMemo } from 'react';
import { Bar, Icon, Money, Seg } from '../components/ui.jsx';
import { debtTotals, projectDebts, separation, weekIncome, weekSpend } from '../lib/calc.js';
import { dayNum, dowShort, fmtLong, fmtMonthLong, fmtShort, relDays, today, weekStart } from '../lib/date.js';
import { money, pct } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

const PERIOD_LABEL = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' };

export default function Home({ go }) {
  const { state, dispatch, payments } = useStore();
  const t = today();
  const w = weekSpend(state, t);
  const period = state.settings.period || 'semana';
  const sep = separation(state, payments, period, t);
  const totals = debtTotals(state);
  const proj = useMemo(() => projectDebts(state, payments), [state, payments]);
  const inc = weekIncome(state, weekStart(t));
  const used = w.budget ? w.spent / w.budget : 0;
  const over = used >= 0.8;
  const next = payments.find((p) => !p.paid && p.date >= t);
  const late = payments.filter((p) => !p.paid && p.date < t);

  const perDay = w.left > 0 ? w.left / w.daysLeft : 0;
  let msg;
  if (w.left < 0) msg = `Te pasaste ${money(-w.left)}. Aprieta un poco los próximos días.`;
  else if (over) msg = `Ojo: te quedan ${money(w.left)}. Unos ${money(perDay)} por día hasta el domingo.`;
  else msg = `Vas bien. Son unos ${money(perDay)} por día hasta el domingo.`;

  return (
    <div className="screen">
      <div className="between" style={{ marginBottom: 18 }}>
        <div>
          <div className="muted small">{fmtLong(t)}</div>
          <div className="h2">Hola, {state.settings.name}</div>
        </div>
        <button className="icon-btn" onClick={() => go('ajustes')} aria-label="Ajustes" style={{ color: 'var(--violet)', fontWeight: 700 }}>
          {state.settings.name.charAt(0)}
        </button>
      </div>

      <div className="stack">
        {/* Puedes gastar esta semana */}
        <div className="card">
          <div className="muted">Puedes gastar esta semana</div>
          <Money value={Math.max(0, w.left)} className="" style={{ fontSize: 56, lineHeight: 1.1, display: 'block', margin: '4px 0 14px', color: w.left < 0 ? 'var(--coral)' : 'var(--text)' }} />
          <Bar value={used} tone={over ? 'coral' : ''} />
          <div className="between small" style={{ marginTop: 10 }}>
            <span className="muted">Gastaste {money(w.spent)} de {money(w.budget)}</span>
            <span className={over ? 'coral' : 'lime'} style={{ fontWeight: 600 }}>{pct(used)} usado</span>
          </div>
          <div className="row small" style={{ marginTop: 10, gap: 8 }}>
            <span className="chip" style={{ height: 30, display: 'inline-flex', alignItems: 'center', fontSize: 12 }}>Gasolina {money(Math.max(0, w.budgetGas - w.gas))}</span>
            <span className="chip" style={{ height: 30, display: 'inline-flex', alignItems: 'center', fontSize: 12 }}>Personal {money(Math.max(0, w.budgetPersonal - w.personal))}</span>
          </div>
          <div className="divider" />
          <div style={{ color: w.left < 0 ? 'var(--coral)' : 'var(--text)' }}>{msg}</div>
        </div>

        {/* Cuánto separar */}
        <div className="card">
          <div className="muted" style={{ marginBottom: 12 }}>Cuánto separar para pagos</div>
          <Seg options={[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']]} value={period} onChange={(v) => dispatch({ type: 'settings', patch: { period: v } })} />
          <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 16 }}>
            <Money value={sep.amount} style={{ fontSize: 36 }} />
            <span className="muted">{PERIOD_LABEL[period]}</span>
          </div>
          <div className="faint small" style={{ marginTop: 4 }}>
            Así cubres los {sep.count} pagos de los próximos 30 días ({money(sep.total)}).
            {sep.envelopes > 0 && <> Más {money(sep.envelopes)} para tus apartados.</>}
          </div>
        </div>

        {/* Próximo pago */}
        {(next || late.length > 0) && (
          <button className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('pagos')}>
            {next && (
              <div className="row">
                <div className="card2" style={{ width: 52, height: 56, display: 'grid', placeItems: 'center', lineHeight: 1.1 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="lime xs" style={{ fontWeight: 700 }}>{dowShort(next.date)}</div>
                    <div className="num" style={{ fontSize: 20 }}>{dayNum(next.date)}</div>
                  </div>
                </div>
                <div className="grow">
                  <div className="muted small">Próximo pago · {relDays(next.date, t)}</div>
                  <div style={{ fontWeight: 600 }} className="ellipsis">{next.name}</div>
                </div>
                <div className="num" style={{ fontSize: 20 }}>{money(next.amount)}</div>
              </div>
            )}
            {late.length > 0 && (
              <>
                {next && <div className="divider" />}
                <div className="coral small">
                  {late.length === 1 ? `Queda 1 pago con fecha pasada: ${late[0].name} ${money(late[0].amount)}` : `Quedan ${late.length} pagos con fecha pasada (${money(sep.overdueTotal || late.reduce((s, p) => s + p.amount, 0))})`}
                </div>
              </>
            )}
          </button>
        )}

        {/* Ingresos de la semana */}
        <button className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('ingresos')}>
          <div className="between">
            <div>
              <div className="muted">Llevas esta semana</div>
              <Money value={inc.total} style={{ fontSize: 28 }} />
            </div>
            <div className="small" style={{ textAlign: 'right' }}>
              <div className="faint">Meta {money(state.settings.incomeGoalWeek)}</div>
              <div className={inc.total >= state.settings.incomeGoalWeek ? 'lime' : 'muted'} style={{ fontWeight: 600 }}>{pct(inc.total / state.settings.incomeGoalWeek)}</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}><Bar value={inc.total / state.settings.incomeGoalWeek} tone="violet" thin /></div>
        </button>

        {/* Fecha de libertad */}
        <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('deudas')}>
          <Ring value={totals.pct} />
          <div className="grow">
            <div className="muted small">Tu fecha de libertad</div>
            <div className="h3" style={{ fontSize: 22 }}>{proj.freedom ? fmtMonthLong(proj.freedom) : 'Más de 15 años'}</div>
            <div className="faint small">Te faltan {money(totals.now)} · llevas {money(totals.paid)} pagados</div>
          </div>
          <Icon name="next" size={18} />
        </button>
      </div>
    </div>
  );
}

export function Ring({ value, size = 64 }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--lime)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * Math.max(0.001, Math.min(1, value))} ${c}`} style={{ transition: 'stroke-dasharray .4s var(--ease)' }} />
      </svg>
      <div className="num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14 }}>{pct(value)}</div>
    </div>
  );
}

