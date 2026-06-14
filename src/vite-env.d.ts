/// <reference types="vite/client" />

/**
 * Versão do app injetada no build via `define` (vite.config.ts e
 * vitest.config.ts), a partir do `package.json`. Fonte única de versão (P6-06).
 */
declare const __APP_VERSION__: string;
