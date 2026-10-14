import { useEffect, useState } from 'react';

// Revisa si hay una versión publicada más nueva que la que está abierta y ofrece actualizar.
// Cada build escribe version.json con su identificador (ver vite.config.js).
const SEEN = 'finito:version';

async function fetchLatest() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null; // sin internet: no pasa nada
  }
}

export default function UpdateBanner() {
  const [latest, setLatest] = useState(null);
  const [justUpdated, setJustUpdated] = useState(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    // Después de actualizar, avisa una vez qué cambió
    try {
      const prev = localStorage.getItem(SEEN);
      if (prev && prev !== __BUILD_ID__) setJustUpdated(__APP_NOTES__);
      localStorage.setItem(SEEN, __BUILD_ID__);
    } catch { /* sin almacenamiento */ }

    const check = async () => {
      const v = await fetchLatest();
      if (v && v.build && v.build !== __BUILD_ID__) setLatest(v);
    };
    check();
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(check, 30 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, []);

  const update = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
    } catch { /* igual recargamos */ }
    window.location.reload();
  };

  if (latest) {
    return (
      <div className="update-banner" role="status">
        <div className="grow">
          <b>Hay una nueva versión{latest.version ? ` (v${latest.version})` : ''}</b>
          <div className="xs" style={{ opacity: 0.8 }}>{latest.notes || 'Actualiza para tener lo más nuevo.'}</div>
        </div>
        <button onClick={update}>Actualizar</button>
      </div>
    );
  }
  if (justUpdated) {
    return (
      <div className="update-banner done" role="status">
        <div className="grow">
          <b>Ya tienes la v{__APP_VERSION__}</b>
          <div className="xs" style={{ opacity: 0.8 }}>{justUpdated}</div>
        </div>
        <button onClick={() => setJustUpdated(null)} aria-label="Cerrar">OK</button>
      </div>
    );
  }
  return null;
}
