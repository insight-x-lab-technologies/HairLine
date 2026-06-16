import layersData from '../data/polishedBackground.json';

/**
 * parallaxBackground — lógica PURA do fundo de espaço RASTER do tema "Polido"
 * (P10-11). Define as camadas (dado) e calcula o offset de tiling/parallax por
 * camada (função pura, sem Phaser): o `SpriteTheme` só aplica o resultado num
 * `TileSprite`. É apresentação (decorativo, fora de `hashState`): pode usar
 * `delta`/tempo de parede e não toca a simulação.
 *
 * As velocidades vêm de `data/polishedBackground.json` (presentation-only, NÃO
 * importado por `src/sim`/`content`), espelhando o parallax procedural (P10-07):
 * camada distante lenta → estrelas próximas rápidas.
 */

/** Uma camada de fundo: textura tileável + velocidade de descida (px/s). */
export interface ParallaxLayer {
  /** Chave da textura no cache do Phaser (convenção `spr-bg-*`). */
  readonly key: string;
  /** Descida em px/s (parallax): maior = "mais próxima". */
  readonly speedPxPerSec: number;
}

/** Camadas registradas, da mais distante (lenta) para a mais próxima (rápida). */
export function parallaxLayers(): readonly ParallaxLayer[] {
  return layersData.layers;
}

/**
 * Avança o offset de tiling de uma camada por `dtMs`, mantendo-o no intervalo
 * `[0, wrap)` (módulo) para não crescer sem limite ao longo da partida. Função
 * pura: mesmas entradas ⇒ mesma saída (testável headless). Aceita velocidade
 * negativa (direção do scroll) e normaliza corretamente.
 */
export function advanceTileOffset(
  prevOffset: number,
  speedPxPerSec: number,
  dtMs: number,
  wrap: number,
): number {
  if (wrap <= 0) return 0;
  const next = prevOffset + speedPxPerSec * (dtMs / 1000);
  return ((next % wrap) + wrap) % wrap;
}
