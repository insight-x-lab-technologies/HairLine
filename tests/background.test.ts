import { describe, it, expect } from 'vitest';
import { Rng } from '../src/services/Rng';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../src/config/layout';
import {
  createStarField,
  advanceStarField,
  createNebula,
  advanceNebula,
} from '../src/render/background';
import { getEffects } from '../src/content';
import type { BackgroundConfig } from '../src/content/types';

const CFG: BackgroundConfig = {
  baseColor: '#070912',
  starLayers: [
    { count: 4, speed: 10, size: 1, color: '#2b6f78', alpha: 0.3 },
    { count: 3, speed: 50, size: 1.5, color: '#39f5e8', alpha: 0.5 },
    { count: 2, speed: 120, size: 2.4, color: '#9af7ef', alpha: 0.8 },
  ],
  nebula: {
    count: 3,
    driftY: 6,
    radiusMin: 100,
    radiusMax: 200,
    alpha: 0.05,
    colors: ['#16235c', '#3a1f5e'],
  },
};

describe('background — campo de estrelas multicamada (P10-07)', () => {
  it('cria exatamente a soma das contagens das camadas', () => {
    const stars = createStarField(CFG, new Rng(1));
    expect(stars.length).toBe(4 + 3 + 2);
  });

  it('cada estrela herda velocidade/tamanho/alpha da sua camada (parallax)', () => {
    const stars = createStarField(CFG, new Rng(1));
    const speeds = new Set(stars.map((s) => s.speed));
    // Há tantas velocidades distintas quanto camadas ⇒ profundidades distintas.
    expect(speeds).toEqual(new Set([10, 50, 120]));
    // Camada mais "próxima" (rápida) é maior e mais brilhante que a distante.
    const near = stars.find((s) => s.speed === 120)!;
    const far = stars.find((s) => s.speed === 10)!;
    expect(near.size).toBeGreaterThan(far.size);
    expect(near.alpha).toBeGreaterThan(far.alpha);
  });

  it('posiciona dentro do mundo virtual', () => {
    const stars = createStarField(CFG, new Rng(7));
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(VIRTUAL_WIDTH);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(VIRTUAL_HEIGHT);
    }
  });

  it('é determinístico para a mesma seed', () => {
    const a = createStarField(CFG, new Rng(42));
    const b = createStarField(CFG, new Rng(42));
    expect(a).toEqual(b);
  });

  it('desce as estrelas ∝ velocidade da camada', () => {
    const stars = createStarField(CFG, new Rng(3));
    const before = stars.map((s) => ({ y: s.y, speed: s.speed }));
    advanceStarField(stars, 0.1, new Rng(9));
    stars.forEach((s, i) => {
      // Não cruzou a borda ⇒ desceu exatamente speed*dt.
      if (s.y <= VIRTUAL_HEIGHT && before[i]!.y + s.speed * 0.1 <= VIRTUAL_HEIGHT) {
        expect(s.y).toBeCloseTo(before[i]!.y + before[i]!.speed * 0.1, 5);
      }
    });
  });

  it('recicla a estrela ao sair embaixo (sem alocar): volta ao topo com novo x', () => {
    const stars = createStarField(CFG, new Rng(3));
    const star = stars[0]!;
    star.y = VIRTUAL_HEIGHT - 1;
    const ref = stars; // mesma referência de array (sem new)
    advanceStarField(stars, 1, new Rng(11)); // 1s * speed grande ⇒ ultrapassa
    expect(stars).toBe(ref);
    // Alguma estrela rápida certamente voltou ao topo.
    const wrapped = stars.find((s) => s.y < 5);
    expect(wrapped).toBeDefined();
    expect(wrapped!.x).toBeGreaterThanOrEqual(0);
    expect(wrapped!.x).toBeLessThanOrEqual(VIRTUAL_WIDTH);
  });
});

describe('background — nebulosa procedural (P10-07)', () => {
  it('cria exatamente count blobs dentro da faixa de raio', () => {
    const blobs = createNebula(CFG, new Rng(5));
    expect(blobs.length).toBe(3);
    for (const b of blobs) {
      expect(b.radius).toBeGreaterThanOrEqual(CFG.nebula.radiusMin);
      expect(b.radius).toBeLessThanOrEqual(CFG.nebula.radiusMax);
      expect(b.alpha).toBe(CFG.nebula.alpha);
    }
  });

  it('count 0 ou sem cores ⇒ sem blobs', () => {
    expect(createNebula({ ...CFG, nebula: { ...CFG.nebula, count: 0 } }, new Rng(1))).toHaveLength(0);
    expect(createNebula({ ...CFG, nebula: { ...CFG.nebula, colors: [] } }, new Rng(1))).toHaveLength(
      0,
    );
  });

  it('deriva devagar e recicla pelo topo ao sair embaixo', () => {
    const blobs = createNebula(CFG, new Rng(5));
    const b = blobs[0]!;
    b.y = VIRTUAL_HEIGHT + b.radius + 1; // já passou totalmente
    advanceNebula(blobs, CFG.nebula.driftY, 1, new Rng(2));
    expect(b.y).toBeCloseTo(-b.radius, 5);
  });

  it('é determinístico para a mesma seed', () => {
    expect(createNebula(CFG, new Rng(99))).toEqual(createNebula(CFG, new Rng(99)));
  });
});

describe('background — dados reais de effects.json', () => {
  it('a seção background existe com ≥2 camadas (sensação de profundidade)', () => {
    const bg = getEffects().background;
    expect(bg.starLayers.length).toBeGreaterThanOrEqual(2);
    // Camadas com velocidades distintas ⇒ parallax real.
    const speeds = new Set(bg.starLayers.map((l) => l.speed));
    expect(speeds.size).toBeGreaterThanOrEqual(2);
  });

  it('alphas do fundo são baixos (não disputa com balas/anel)', () => {
    const bg = getEffects().background;
    for (const l of bg.starLayers) expect(l.alpha).toBeLessThanOrEqual(1);
    expect(bg.nebula.alpha).toBeLessThanOrEqual(0.2);
  });
});
