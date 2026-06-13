import { describe, it, expect } from 'vitest';
import { polygonPoints, shapePoints } from '../src/ui/shapes';

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
