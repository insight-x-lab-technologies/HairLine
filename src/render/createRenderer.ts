import type { GameRenderer } from './GameRenderer';
import { VectorTheme } from './VectorTheme';

/**
 * createRenderer — resolve o `rendererId` do registro de temas (P10-04) para a
 * implementação concreta de `GameRenderer`. Isolado num módulo Phaser-side para
 * que o registro (`config/themes`) permaneça dado puro/testável headless.
 *
 * Hoje só o **vetorial** está registrado; o renderer por sprites (P10-09) entra
 * aqui como mais um `case`. Id desconhecido cai no vetorial (default seguro).
 */
export function createRenderer(rendererId: string): GameRenderer {
  switch (rendererId) {
    case 'vector':
    default:
      return new VectorTheme();
  }
}
