import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { money } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';

// ---------- Iconos (trazo redondeado) ----------
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const Icon = ({ name, size = 22 }) => {
  const s = { width: size, height: size, viewBox: '0 0 24 24', ...P, 'aria-hidden': true };
  switch (name) {
    case 'home': return <svg {...s}><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>;
    case 'cal': return <svg {...s}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" /></svg>;
    case 'card': return <svg {...s}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 11h18M7 15h4" /></svg>;
    case 'more': return <svg {...s}><circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>;
    case 'plus': return <svg {...s} strokeWidth="2.6"><path d="M12 5v14M5 12h14" /></svg>;
    case 'check': return <svg {...s} strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case 'mic': return <svg {...s}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case 'back': return <svg {...s}><path d="M15 5l-7 7 7 7" /></svg>;
    case 'next': return <svg {...s}><path d="M9 5l7 7-7 7" /></svg>;
    case 'del': return <svg {...s}><path d="M8 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-6-7z" /><path d="M11 9l6 6M17 9l-6 6" /></svg>;
    case 'env': return <svg {...s}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 8l9 6 9-6" /></svg>;
    case 'trend': return <svg {...s}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>;
    case 'bars': return <svg {...s}><path d="M6 20V11M12 20V5M18 20v-6" /></svg>;
    case 'gear': return <svg {...s}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case 'save': return <svg {...s}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    case 'x': return <svg {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'edit': return <svg {...s}><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>;
    case 'minus': return <svg {...s} strokeWidth="2.6"><path d="M5 12h14" /></svg>;
    default: return null;
  }
};

// ---------- Número que cuenta hasta su valor ----------
export function Money({ value, className = '', style, duration = 400 }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const first = useRef(true);
  useEffect(() => {
    const start = first.current ? 0 : from.current;
    first.current = false;
    if (start === value) { setShown(value); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return <span className={`num ${className}`} style={style}>{money(shown)}</span>;
}

export const Bar = ({ value, tone, thin }) => (
  <div className={`bar ${tone || ''} ${thin ? 'thin' : ''}`}>
    <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
  </div>
);

export function Seg({ options, value, onChange }) {
  const ref = useRef();
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector('button.on');
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options.length]);
  return (
    <div className="seg" ref={ref}>
      {thumb && <span className="thumb" style={thumb} />}
      {options.map(([k, label]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  );
}

export function Sheet({ onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </>
  );
}

export function Toast() {
  const { toast, setToast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id} role="status">
      <span>{toast.msg}</span>
      {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>Deshacer</button>}
    </div>
  );
}

export function Confetti({ show }) {
  if (!show) return null;
  const colors = ['#C8F169', '#A89CFF', '#7FD4E6', '#FF8B78', '#F3F4F6'];
  return (
    <div className="confetti" key={show}>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 90 + (i % 4) * 30;
        return <i key={i} style={{ background: colors[i % 5], '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r + 120}px`, '--r': `${i * 47}deg` }} />;
      })}
    </div>
  );
}

export const Header = ({ title, back, right, sub }) => (
  <div className="between" style={{ marginBottom: 18, minHeight: 44 }}>
    <div className="row grow">
      {back && <button className="icon-btn" onClick={back} aria-label="Regresar"><Icon name="back" size={20} /></button>}
      <div className="grow">
        <div className="h1 ellipsis" style={{ fontSize: back ? 24 : 28 }}>{title}</div>
        {sub && <div className="muted small">{sub}</div>}
      </div>
    </div>
    {right}
  </div>
);

export function Empty({ icon, color = 'var(--lime)', title, text, action, onAction }) {
  return (
    <div className="empty">
      <div className="ico" style={{ color }}><Icon name={icon} size={32} /></div>
      <div className="h3" style={{ fontSize: 20 }}>{title}</div>
      <p className="muted" style={{ margin: '8px 0 18px' }}>{text}</p>
      {action && <button className="btn primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function useConfetti() {
  const [c, setC] = useState(0);
  const fire = () => { setC(Date.now()); setTimeout(() => setC(0), 1000); };
  return [c, fire];
}
