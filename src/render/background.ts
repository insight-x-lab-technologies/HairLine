import { Rng } from '../services/Rng';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import type { BackgroundConfig } from '../content/types';

/**
 * background — lógica PURA do fundo de espaço procedural (P10-07).
 *
 * Gera/avança um campo de estrelas multicamada (parallax) e uma nebulosa
 * procedural sutil a partir da seção `background` de `effects.json`. Sem Phaser,
 * sem `Math.random` (todo o sorteio passa por `Rng` DECORATIVO) e sem alocação
 * por frame: os arrays são pré-alocados na criação e as estrelas/blobs são
 * RECICLADOS ao sair da tela (mutação em lugar). É apresentação pura — não toca
 * a simulação e pode usar tempo de parede/`delta` (não entra em `hashState`).
 */

/** Estrela já com a cor resolvida (hex→int); velocidade/tamanho vêm da camada. */
export interface Star {
  x: number;
  y: number;
  size: number;
  /** Descida em px/s — quanto maior, mais "próxima" (parallax). */
  speed: number;
  alpha: number;
  color: number;
}

/** Blob de nebulosa: disco suave (desenhado como anéis concêntricos baratos). */
export interface NebulaBlob {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: number;
}

/** hex "#rrggbb" → int (sem depender do Phaser; módulo é headless/testável). */
function hexToInt(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16) | 0;
}

/**
 * Cria o campo de estrelas multicamada. Cada camada contribui `count` estrelas
 * que herdam sua velocidade/tamanho/alpha (⇒ profundidades com parallax
 * distinto). Pré-alocado: chamado uma vez no setup, nunca por frame.
 */
export function createStarField(cfg: BackgroundConfig, rng: Rng): Star[] {
  const stars: Star[] = [];
  for (const layer of cfg.starLayers) {
    const color = hexToInt(layer.color);
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: rng.range(0, VIRTUAL_WIDTH),
        y: rng.range(0, VIRTUAL_HEIGHT),
        size: layer.size,
        speed: layer.speed,
        alpha: layer.alpha,
        color,
      });
    }
  }
  return stars;
}

/**
 * Avança o campo: cada estrela desce ∝ velocidade da sua camada e, ao sair
 * embaixo, é RECICLADA no topo com novo x (sem alocar). Mutação em lugar.
 */
export function advanceStarField(stars: Star[], dtSec: number, rng: Rng): void {
  for (const s of stars) {
    s.y += s.speed * dtSec;
    if (s.y > VIRTUAL_HEIGHT) {
      s.y = 0;
      s.x = rng.range(0, VIRTUAL_WIDTH);
    }
  }
}

/**
 * Cria a nebulosa procedural: `count` blobs com raio sorteado na faixa e cor de
 * uma paleta. `count` 0 ou paleta vazia ⇒ sem nebulosa (fundo só com estrelas).
 */
export function createNebula(cfg: BackgroundConfig, rng: Rng): NebulaBlob[] {
  const { nebula } = cfg;
  const blobs: NebulaBlob[] = [];
  if (nebula.count <= 0 || nebula.colors.length === 0) return blobs;
  for (let i = 0; i < nebula.count; i++) {
    const radius = rng.range(nebula.radiusMin, nebula.radiusMax);
    blobs.push({
      x: rng.range(0, VIRTUAL_WIDTH),
      y: rng.range(-radius, VIRTUAL_HEIGHT),
      radius,
      alpha: nebula.alpha,
      color: hexToInt(rng.pick(nebula.colors)),
    });
  }
  return blobs;
}

/**
 * Deriva a nebulosa devagar (descida `driftY` px/s) e a recicla pelo topo quando
 * o blob sai inteiro pela base. Mutação em lugar (sem alocação por frame).
 */
export function advanceNebula(blobs: NebulaBlob[], driftY: number, dtSec: number, rng: Rng): void {
  for (const b of blobs) {
    b.y += driftY * dtSec;
    if (b.y - b.radius > VIRTUAL_HEIGHT) {
      b.y = -b.radius;
      b.x = rng.range(0, VIRTUAL_WIDTH);
    }
  }
}
