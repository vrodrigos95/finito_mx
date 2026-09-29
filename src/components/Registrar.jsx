import { useEffect, useRef, useState } from 'react';
import { today, fmtShort } from '../lib/date.js';
import { money } from '../lib/money.js';
import { useStore } from '../lib/store.jsx';
import { listen, parsePhrase, speechSupported } from '../lib/voice.js';
import { Icon, Seg, Sheet } from './ui.jsx';

export default function Registrar({ onClose, initialType = 'gasto' }) {
  const { state, dispatch, notify } = useStore();
  const [type, setType] = useState(initialType);
  const [raw, setRaw] = useState('');
  const [date, setDate] = useState(today());
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const stopRef = useRef(null);
  const amount = raw ? Number(raw) : 0;
  const tags = type === 'gasto' ? state.expenseTags : state.incomeTags;

  useEffect(() => () => stopRef.current?.(), []);

  const save = (category, amt, t = type) => {
    const value = amt || 0;
    if (!value) { notify('Escribe o di un monto primero'); return; }
    const id = Math.random().toString(36).slice(2, 10);
    const item = t === 'gasto' ? { id, date, category, amount: value } : { id, date, source: category, amount: value };
    dispatch({ type: t === 'gasto' ? 'addExpense' : 'addIncome', item });
    // La etiqueta aprende el último monto usado
    dispatch({ type: 'updateTag', kind: t, name: category, patch: { amount: value } });
    notify(`${category} ${money(value)} ${t === 'gasto' ? 'guardado' : 'sumado'}`, () => {
      dispatch({ type: t === 'gasto' ? 'removeExpense' : 'removeIncome', id });
    });
    setRaw('');
    setText('');
    setHeard('');
    setTimeout(onClose, 180);
  };

  const tapTag = (tag) => save(tag.name, amount || tag.amount);

  const press = (k) => {
    if (k === 'del') return setRaw((r) => r.slice(0, -1));
    setRaw((r) => (r + k).replace(/^0+/, '').slice(0, 7));
  };

  const applyPhrase = (phrase) => {
    const r = parsePhrase(phrase, { expenseTags: state.expenseTags, incomeTags: state.incomeTags });
    if (r.amount) {
      setType(r.type);
      save(r.category, r.amount, r.type);
    } else {
      notify('No escuché el monto. Intenta: «gasolina 450»');
    }
  };

  const mic = () => {
    if (listening) { stopRef.current?.(); return; }
    if (!speechSupported()) {
      notify('Usa el micrófono del teclado en el campo de abajo');
      document.getElementById('dictar')?.focus();
      return;
    }
    setHeard('');
    setListening(true);
    let finalText = '';
    stopRef.current = listen({
      onResult: (t, isFinal) => { setHeard(t); if (isFinal) finalText = t; },
      onEnd: () => { setListening(false); if (finalText) applyPhrase(finalText); },
      onError: (e) => {
        setListening(false);
        notify(e === 'not-allowed' ? 'Permite el micrófono o dicta con el teclado' : 'No te escuché, intenta otra vez');
      },
    });
  };

  const addTag = () => {
    const name = newTag.trim();
    if (!name) return setAdding(false);
    dispatch({ type: 'addTag', kind: type, tag: { name: name.charAt(0).toUpperCase() + name.slice(1), amount: amount || 100 } });
    setNewTag('');
    setAdding(false);
  };

  return (
    <Sheet onClose={onClose}>
      <Seg options={[['gasto', 'Gasto'], ['ingreso', 'Ingreso']]} value={type} onChange={(v) => { setType(v); setRaw(''); }} />
      <div className="between" style={{ margin: '18px 0 6px' }}>
        <div className="grow">
          <div className="muted small">{type === 'gasto' ? '¿Cuánto gastaste?' : '¿Cuánto entró?'}</div>
          <div className="num" style={{ fontSize: 48, lineHeight: 1.1, color: amount ? 'var(--text)' : 'var(--text3)' }}>{money(amount)}</div>
          <div className="faint xs" style={{ minHeight: 16 }}>{listening ? (heard || 'Te escucho…') : 'Toca una etiqueta para guardar lo de siempre.'}</div>
        </div>
        <button className={`mic ${listening ? 'on' : ''}`} onClick={mic} aria-label="Dictar">
          <Icon name={listening ? 'x' : 'mic'} size={26} />
        </button>
      </div>

      <div className="tags" style={{ margin: '12px 0' }}>
        {tags.map((t) => (
          <button key={t.name} className="tag" onClick={() => tapTag(t)}>
            {t.name}<small>{money(amount || t.amount)}</small>
          </button>
        ))}
        {adding ? (
          <input autoFocus className="tag" style={{ textAlign: 'center' }} value={newTag} onChange={(e) => setNewTag(e.target.value)} onBlur={addTag} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="Nombre" />
        ) : (
          <button className="tag dashed" onClick={() => setAdding(true)} aria-label="Nueva etiqueta"><Icon name="plus" size={20} /></button>
        )}
      </div>

      <div className="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((k) => <button key={k} onClick={() => press(k)}>{k}</button>)}
        <button onClick={() => press('del')} aria-label="Borrar"><Icon name="del" /></button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <input
          id="dictar"
          className="grow"
          style={{ height: 46, padding: '0 14px', borderRadius: 14, background: 'var(--card2)', border: '1px solid var(--line)' }}
          placeholder="o escribe / dicta: gasolina 450"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && text.trim() && applyPhrase(text)}
          enterKeyHint="done"
        />
        <label className="chip" style={{ display: 'grid', placeItems: 'center', height: 46, position: 'relative' }}>
          {date === today() ? 'Hoy' : fmtShort(date)}
          <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
        </label>
      </div>
    </Sheet>
  );
}
