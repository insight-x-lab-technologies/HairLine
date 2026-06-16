import { describe, it, expect } from 'vitest';
import { advanceTileOffset, parallaxLayers } from '../src/render/parallaxBackground';

describe('parallaxBackground — offset de tiling/parallax do tema "Polido" (P10-11)', () => {
  it('as camadas vêm de dados, com chaves spr-bg-* e velocidades crescentes', () => {
    const layers = parallaxLayers();
    expect(layers.length).toBeGreaterThan(0);
    for (const l of layers) {
      expect(l.key.startsWith('spr-bg-')).toBe(true);
      expect(l.speedPxPerSec).toBeGreaterThan(0);
    }
    // Distante (lenta) → próxima (rápida): parallax monotônico (P10-07).
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i]!.speedPxPerSec).toBeGreaterThan(layers[i - 1]!.speedPxPerSec);
    }
  });

  it('avança proporcional ao tempo e à velocidade', () => {
    // 100 px/s por 1000 ms = 100 px, dentro de wrap=1280.
    expect(advanceTileOffset(0, 100, 1000, 1280)).toBeCloseTo(100);
    expect(advanceTileOffset(0, 50, 2000, 1280)).toBeCloseTo(100);
  });

  it('faz wrap em [0, wrap) — não cresce sem limite na partida longa', () => {
    // 1000 px/s por 2000 ms = 2000 px; wrap=1280 ⇒ 720.
    expect(advanceTileOffset(0, 1000, 2000, 1280)).toBeCloseTo(720);
    // A partir de um offset já alto, continua dentro do intervalo.
    const o = advanceTileOffset(1200, 1000, 1000, 1280); // 2200 % 1280 = 920
    expect(o).toBeGreaterThanOrEqual(0);
    expect(o).toBeLessThan(1280);
    expect(o).toBeCloseTo(920);
  });

  it('velocidade negativa (direção do scroll) normaliza para [0, wrap)', () => {
    // -10 px em wrap=1280 ⇒ 1270.
    const o = advanceTileOffset(0, -10, 1000, 1280);
    expect(o).toBeCloseTo(1270);
    expect(o).toBeGreaterThanOrEqual(0);
    expect(o).toBeLessThan(1280);
  });

  it('wrap inválido (≤0) devolve 0 sem NaN', () => {
    expect(advanceTileOffset(50, 100, 16, 0)).toBe(0);
  });

  it('é pura: mesmas entradas ⇒ mesma saída', () => {
    expect(advanceTileOffset(33, 17, 16, 640)).toBe(advanceTileOffset(33, 17, 16, 640));
  });
});
