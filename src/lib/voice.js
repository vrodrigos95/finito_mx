// Interpreta frases como "gasolina 450", "450 de comida", "uber 3180", "me pagaron 500 de asesorías"
const EXP_WORDS = {
  Gasolina: ['gasolina', 'gas ', 'magna', 'premium', 'cargué', 'cargue'],
  Comida: ['comida', 'comí', 'comi', 'desayuno', 'cena', 'tacos', 'lonche', 'café', 'cafe', 'restaurante'],
  Tienda: ['tienda', 'oxxo', 'seven', 'tiendita', 'antojo', 'jugo', 'galletas', 'refresco', 'botana'],
  Casa: ['casa', 'súper', 'super', 'soriana', 'walmart', 'mandado', 'despensa', 'limpieza'],
  Carro: ['carro', 'auto', 'llanta', 'aceite', 'mecánico', 'mecanico', 'lavado', 'autolavado', 'refacción', 'refaccion'],
  Salidas: ['salida', 'cine', 'fiesta', 'bar', 'cerveza', 'viaje', 'salí', 'sali'],
  Personal: ['personal', 'corte', 'farmacia', 'ropa', 'regalo'],
};
const INC_WORDS = {
  Uber: ['uber'],
  Didi: ['didi', 'di di'],
  P5: ['p5', 'p 5', 'prepa', 'quincena', 'nómina', 'nomina'],
  Asesorías: ['asesoría', 'asesoria', 'asesorías', 'asesorias', 'clase'],
};
const INCOME_HINTS = ['ingreso', 'gané', 'gane', 'me pagaron', 'cobré', 'cobre', 'recibí', 'recibi'];

const NUM_WORDS = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000 };

function parseAmount(text) {
  const t = text.replace(/\$/g, ' ');
  const m = t.match(/(\d[\d.,]*)\s*(mil)?/);
  if (m) {
    let raw = m[1];
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) raw = raw.replace(/,/g, '');
    else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '');
    else raw = raw.replace(',', '.');
    let n = parseFloat(raw);
    if (m[2]) n *= 1000;
    if (!Number.isNaN(n)) return n;
  }
  // "mil quinientos", "trescientos"
  let total = 0;
  let found = false;
  for (const w of t.split(/\s+/)) {
    if (w in NUM_WORDS) {
      found = true;
      if (w === 'mil') total = (total || 1) * 1000;
      else total += NUM_WORDS[w];
    }
  }
  return found ? total : null;
}

export function parsePhrase(text, { expenseTags = [], incomeTags = [] } = {}) {
  const t = ` ${text.toLowerCase().trim()} `;
  const amount = parseAmount(t);
  const find = (dict, extra) => {
    for (const tag of extra) if (t.includes(tag.name.toLowerCase())) return tag.name;
    for (const [k, words] of Object.entries(dict)) if (words.some((w) => t.includes(w))) return k;
    return null;
  };
  const income = find(INC_WORDS, incomeTags);
  const expense = find(EXP_WORDS, expenseTags);
  const isIncome = INCOME_HINTS.some((w) => t.includes(w)) || (!!income && !expense);
  if (isIncome) return { type: 'ingreso', category: income || 'Otro', amount };
  return { type: 'gasto', category: expense || 'Otros', amount };
}

export function speechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listen({ onResult, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'es-MX';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const r = e.results[e.results.length - 1];
    onResult(r[0].transcript, r.isFinal);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return () => rec.stop();
}
