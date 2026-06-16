import { describe, it, expect } from 'vitest';
import { polygonPoints, shapePoints, shipSilhouette, starPoints } from '../src/ui/shapes';

describe('shapes — geometria de polígonos (visual)', () => {
  it('polygonPoints retorna `sides` vértices no raio dado', () => {
    const pts = polygonPoints(0, 0, 10, 6);
    expect(pts).toHaveLength(6);
    for (const p of pts) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 6);
    }
  });

  it('shapePoints mapeia nomes para nº de lados', () => {
    expect(shapePoints('triangle', 0, 0, 5)).toHaveLength(3);
    expect(shapePoints('diamond', 0, 0, 5)).toHaveLength(4);
    expect(shapePoints('hex', 0, 0, 5)).toHaveLength(6);
  });

  it('circle/desconhecido retorna vazio (render desenha círculo)', () => {
    expect(shapePoints('circle', 0, 0, 5)).toEqual([]);
    expect(shapePoints('qualquer', 0, 0, 5)).toEqual([]);
  });

  it('a rotação gira os vértices de forma determinística', () => {
    const a = polygonPoints(0, 0, 10, 4, 0);
    const b = polygonPoints(0, 0, 10, 4, Math.PI / 2);
    expect(a).not.toEqual(b);
    expect(polygonPoints(0, 0, 10, 4, 1)).toEqual(polygonPoints(0, 0, 10, 4, 1));
  });
});

describe('shipSilhouette — nave coesa (P10-05)', () => {
  it('tem 12 vértices, com o nariz no topo e centrado em x', () => {
    const pts = shipSilhouette(0, 0, 30);
    expect(pts).toHaveLength(12);
    const nose = pts.reduce((a, b) => (b.y < a.y ? b : a));
    expect(nose.x).toBeCloseTo(0, 6);
    expect(nose.y).toBeLessThan(0); // aponta para cima
  });

  it('é simétrica no eixo x (centroide em x ≈ 0)', () => {
    const sumX = shipSilhouette(0, 0, 30).reduce((s, p) => s + p.x, 0);
    expect(sumX).toBeCloseTo(0, 6);
  });

  it('cabe dentro do raio dado (silhueta ≠ hitbox, mas tamanho estável)', () => {
    const r = 30;
    for (const p of shipSilhouette(0, 0, r)) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(r + 1e-6);
    }
  });

  it('translada e gira de forma determinística', () => {
    expect(shipSilhouette(5, 7, 10)).toEqual(shipSilhouette(5, 7, 10));
    expect(shipSilhouette(0, 0, 10, 1)).not.toEqual(shipSilhouette(0, 0, 10, 0));
    // Translação desloca todos os vértices igualmente.
    const a = shipSilhouette(0, 0, 10);
    const b = shipSilhouette(100, 50, 10);
    a.forEach((p, i) => {
      const q = b[i]!;
      expect(q.x).toBeCloseTo(p.x + 100, 6);
      expect(q.y).toBeCloseTo(p.y + 50, 6);
    });
  });
});

describe('starPoints — núcleo de chefe (P10-06)', () => {
  it('tem 2·points vértices alternando raio externo/interno', () => {
    const pts = starPoints(0, 0, 10, 4, 5);
    expect(pts).toHaveLength(10);
    pts.forEach((p, i) => {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(i % 2 === 0 ? 10 : 4, 6);
    });
  });

  it('respeita o centro e é determinística', () => {
    const a = starPoints(7, 3, 10, 4, 6, 0.5);
    const b = starPoints(7, 3, 10, 4, 6, 0.5);
    expect(a).toEqual(b);
    // Centro: a média dos vértices fica em (cx, cy) por simetria radial.
    const sx = a.reduce((s, p) => s + p.x, 0) / a.length;
    const sy = a.reduce((s, p) => s + p.y, 0) / a.length;
    expect(sx).toBeCloseTo(7, 6);
    expect(sy).toBeCloseTo(3, 6);
  });

  it('a rotação muda os vértices', () => {
    expect(starPoints(0, 0, 10, 4, 5, 0)).not.toEqual(starPoints(0, 0, 10, 4, 5, 0.3));
  });
});
