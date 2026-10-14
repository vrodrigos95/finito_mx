import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { RELEASE_NOTES } from './src/data/version.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Identificador único de cada build: la app lo compara con version.json para saber si hay algo nuevo
const build = `${version}-${Date.now().toString(36)}`;

// Escribe version.json junto a la app publicada
const versionFile = () => ({
  name: 'finito-version',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, build, notes: RELEASE_NOTES }) });
  },
});

// base relativa: funciona en GitHub Pages (/finito_mx/) y en Hostinger sin cambios
export default defineConfig({
  base: './',
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify(build),
    __APP_NOTES__: JSON.stringify(RELEASE_NOTES),
  },
  build: { outDir: 'docs', emptyOutDir: true },
});
