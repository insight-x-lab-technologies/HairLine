import { defineConfig } from 'vitest/config';
import pkg from './package.json';

// Testes de lógica rodam headless (sem render). O ambiente jsdom só é usado
// onde houver dependência de DOM (ex.: InputService); a simulação e o Rng
// devem rodar sem nenhuma dependência de Phaser/DOM.
export default defineConfig({
  // Espelha o define do vite.config.ts para que about.ts tenha a versão em teste.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    // Padrão headless (sem DOM): simulação e Rng rodam em Node puro.
    // Testes que precisam de DOM declaram `// @vitest-environment jsdom` no
    // topo do arquivo (ex.: InputService.dom.test.ts).
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
