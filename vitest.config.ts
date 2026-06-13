import { defineConfig } from 'vitest/config';

// Testes de lógica rodam headless (sem render). O ambiente jsdom só é usado
// onde houver dependência de DOM (ex.: InputService); a simulação e o Rng
// devem rodar sem nenhuma dependência de Phaser/DOM.
export default defineConfig({
  test: {
    // Padrão headless (sem DOM): simulação e Rng rodam em Node puro.
    // Testes que precisam de DOM declaram `// @vitest-environment jsdom` no
    // topo do arquivo (ex.: InputService.dom.test.ts).
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
