import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Identificador desta compilação: o cliente compara com /version.json para saber se saiu versão nova. */
const BUILD_ID = Date.now().toString(36);

/** Grava dist/version.json com o BUILD_ID (só no build de produção). */
function versionFile(): Plugin {
  return {
    name: 'grimhold-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    // CLIENT_PORT/SERVER_PORT: para rodar um worktree ao lado do principal.
    port: Number(process.env.CLIENT_PORT ?? 5173),
    proxy: {
      '/api': `http://localhost:${process.env.SERVER_PORT ?? 3001}`,
      '/ws': { target: `ws://localhost:${process.env.SERVER_PORT ?? 3001}`, ws: true },
    },
  },
});
