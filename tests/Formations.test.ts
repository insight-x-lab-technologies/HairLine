import { describe, it, expect } from 'vitest';
import { formationOffsets, FORMATION_TYPES } from '../src/systems/Formations';

describe('Formations — geometria de formações de inimigos (Fase 4)', () => {
  it('line: N inimigos numa linha horizontal centrada, mesmo y', () => {
    const pts = formationOffsets('line', 4, 60);
    expect(pts).toHaveLength(4);
    // simétrico em torno de 0 e todos no mesmo dy
    const sumX = pts.reduce((s, p) => s + p.dx, 0);
    expect(sumX).toBeCloseTo(0, 6);
    expect(pts.every((p) => p.dy === 0)).toBe(true);
  });

  it('column: empilha verticalmente (mesmo x, dy crescente em módulo)', () => {
    const pts = formationOffsets('column', 3, 50);
    expect(pts.every((p) => p.dx === 0)).toBe(true);
    expect(pts.map((p) => p.dy)).toEqual([0, -50, -100]);
  });

  it('vee: simétrico em x; os das pontas entram depois (dy mais negativo)', () => {
    const pts = formationOffsets('vee', 5, 40);
    expect(pts).toHaveLength(5);
    const sumX = pts.reduce((s, p) => s + p.dx, 0);
    expect(sumX).toBeCloseTo(0, 6);
    // o do centro lidera (dy=0), os das pontas têm dy < 0
    const center = pts[2]!;
    expect(center.dx).toBeCloseTo(0, 6);
    expect(center.dy).toBe(0);
    expect(pts[0]!.dy).toBeLessThan(0);
    expect(pts[4]!.dy).toBeLessThan(0);
  });

  it('count<=1 retorna um único ponto na origem', () => {
    expect(formationOffsets('line', 1, 60)).toEqual([{ dx: 0, dy: 0 }]);
  });

  it('é determinístico e cobre os tipos exportados', () => {
    expect(FORMATION_TYPES).toContain('line');
    expect(FORMATION_TYPES).toContain('vee');
    expect(FORMATION_TYPES).toContain('column');
    expect(formationOffsets('line', 3, 60)).toEqual(formationOffsets('line', 3, 60));
  });
});
