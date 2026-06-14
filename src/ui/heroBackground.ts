/**
 * heroBackground — geometria decorativa PURA do fundo da home (P6-06-02). Gera,
 * de forma determinística (via `Rng` semeável — nunca `Math.random`), os pontos
 * do campo de estrelas e as "vigas" horizontais neon que enriquecem o fundo
 * além do starfield genérico. A `MenuScene` desenha e anima; aqui só calculamos.
 *
 * É render decorativo: não toca a simulação, o replay nem o hash. A seed vem do
 * relógio (decorativo), seguindo a convenção do projeto (ARCHITECTURE §determinismo).
 */
import { Rng } from '../services/Rng';

export interface BgStar {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

export interface BgBeam {
  readonly y: number;
  readonly alpha: number;
}

export interface HeroBg {
  readonly stars: readonly BgStar[];
  readonly beams: readonly BgBeam[];
}

/**
 * Gera o fundo para um campo `w`×`h`. `starCount`/`beamCount` controlam a
 * densidade (mantê-los baixos é barato — orçamento de celular fraco).
 */
export function heroBackground(
  w: number,
  h: number,
  seed: number,
  starCount = 70,
  beamCount = 4,
): HeroBg {
  const rng = new Rng(seed >>> 0);

  const stars: BgStar[] = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: rng.range(0, w),
      y: rng.range(0, h),
      r: rng.range(0.6, 2.2),
      alpha: rng.range(0.15, 0.7),
    });
  }

  const beams: BgBeam[] = [];
  for (let i = 0; i < beamCount; i++) {
    beams.push({ y: rng.range(h * 0.08, h * 0.92), alpha: rng.range(0.04, 0.12) });
  }

  return { stars, beams };
}
