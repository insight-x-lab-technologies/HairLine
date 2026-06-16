import type { GameRenderer } from './GameRenderer';
import { VectorTheme } from './VectorTheme';
import { SpriteTheme } from './SpriteTheme';

/**
 * createRenderer — resolve o `rendererId` do registro de temas (P10-04) para a
 * implementação concreta de `GameRenderer`. Isolado num módulo Phaser-side para
 * que o registro (`config/themes`) permaneça dado puro/testável headless.
 *
 * `vector` = neon vetorial (arcade). `sprite` = tema "Polido" (P10-09), que herda
 * o vetorial e cai nele onde faltar arte. Id desconhecido cai no vetorial
 * (default seguro).
 */
export function createRenderer(rendererId: string): GameRenderer {
  switch (rendererId) {
    case 'sprite':
      return new SpriteTheme();
    case 'vector':
    default:
      return new VectorTheme();
  }
}
