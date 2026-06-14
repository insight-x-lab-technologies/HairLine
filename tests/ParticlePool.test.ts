import { describe, it, expect } from 'vitest';
import { ParticlePool } from '../src/ui/ParticlePool';

const opts = {
  x: 100,
  y: 200,
  count: 8,
  speed: 240,
  lifeTicks: 10,
  size: 3,
  color: 0xff5d8f,
};

describe('ParticlePool — infra de partículas decorativas (P5-01-02)', () => {
  it('burst ativa N partículas', () => {
    const pool = new ParticlePool(64);
    pool.burst(opts);
    expect(pool.activeCount).toBe(8);
  });

  it('update mata partículas após lifeTicks e libera slots para reuso', () => {
    const pool = new ParticlePool(64);
    pool.burst(opts);
    pool.update(10); // chega na vida
    expect(pool.activeCount).toBe(0);
    // Slots reaproveitados: novo burst volta a alocar normalmente.
    pool.burst(opts);
    expect(pool.activeCount).toBe(8);
  });

  it('saturação respeita a capacidade e descarta o excedente (sem estourar)', () => {
    const pool = new ParticlePool(10);
    pool.burst({ ...opts, count: 25 });
    expect(pool.activeCount).toBe(10);
  });

  it('determinismo: mesma seed ⇒ mesmas partículas (posições idênticas)', () => {
    const snapshot = (seed: number): number[] => {
      const pool = new ParticlePool(64, seed);
      pool.burst(opts);
      pool.update(2);
      const xs: number[] = [];
      pool.forEachActive((x, y) => xs.push(x, y));
      return xs;
    };
    expect(snapshot(123)).toEqual(snapshot(123));
    // Seeds diferentes ⇒ espalhamento diferente.
    expect(snapshot(123)).not.toEqual(snapshot(999));
  });

  it('alpha e size decaem monotonicamente ao longo da vida', () => {
    const pool = new ParticlePool(8);
    pool.burst({ ...opts, count: 1 });
    let prevAlpha = Infinity;
    let prevSize = Infinity;
    for (let t = 0; t < 9; t++) {
      pool.update(1);
      let alpha = 0;
      let size = 0;
      pool.forEachActive((_x, _y, s, _c, a) => {
        alpha = a;
        size = s;
      });
      if (pool.activeCount === 0) break;
      expect(alpha).toBeLessThanOrEqual(prevAlpha);
      expect(size).toBeLessThanOrEqual(prevSize);
      prevAlpha = alpha;
      prevSize = size;
    }
  });
});
