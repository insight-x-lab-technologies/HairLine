import { describe, it, expect } from 'vitest';
import { EnemyPool } from '../src/entities/EnemyPool';
import type { Pattern } from '../src/content/types';

const bounds = { w: 720, h: 1280 };
const pat: Pattern = { id: 'p', emitters: [] };

describe('EnemyPool — pooling de inimigos (docs/02 §3.3)', () => {
  it('spawn ativa um inimigo com hp/raio/padrão e idade zero', () => {
    const pool = new EnemyPool(8);
    const e = pool.spawn(100, -20, 0, 60, 3, 18, pat)!;
    expect(e).not.toBeNull();
    expect(pool.activeCount).toBe(1);
    expect(e.hp).toBe(3);
    expect(e.radius).toBe(18);
    expect(e.ageTicks).toBe(0);
    expect(e.pattern).toBe(pat);
  });

  it('advance integra posição e incrementa a idade em ticks', () => {
    const pool = new EnemyPool(8);
    const e = pool.spawn(100, 0, 10, 60, 3, 18, pat)!;
    pool.advance(0.5, bounds);
    expect(e.x).toBeCloseTo(105, 6);
    expect(e.y).toBeCloseTo(30, 6);
    expect(e.ageTicks).toBe(1);
  });

  it('recicla inimigos que saem pela base da tela', () => {
    const pool = new EnemyPool(8);
    pool.spawn(100, 1270, 0, 1000, 3, 18, pat);
    expect(pool.activeCount).toBe(1);
    for (let i = 0; i < 60; i++) pool.advance(1 / 60, bounds);
    expect(pool.activeCount).toBe(0);
  });

  it('respeita capacidade (spawn além do limite retorna null)', () => {
    const pool = new EnemyPool(1);
    expect(pool.spawn(0, 0, 0, 1, 1, 1, pat)).not.toBeNull();
    expect(pool.spawn(0, 0, 0, 1, 1, 1, pat)).toBeNull();
    expect(pool.capacity).toBe(1);
  });

  it('reaproveita slots após reciclagem (sem alocar)', () => {
    const pool = new EnemyPool(1);
    const first = pool.spawn(100, 1300, 0, 1000, 3, 18, pat)!;
    pool.advance(1, bounds); // sai pela base, recicla
    expect(pool.activeCount).toBe(0);
    const second = pool.spawn(50, 0, 0, 0, 3, 18, pat);
    expect(second).toBe(first);
  });

  it('matar (hp<=0) é refletido por killAndRecycle', () => {
    const pool = new EnemyPool(4);
    const e = pool.spawn(10, 10, 0, 0, 1, 18, pat)!;
    e.hp = 0;
    pool.killAndRecycle(e);
    expect(pool.activeCount).toBe(0);
  });

  it('é determinístico para os mesmos spawns e passos', () => {
    const run = (): number[] => {
      const pool = new EnemyPool(8);
      pool.spawn(100, 0, 20, 60, 3, 18, pat);
      pool.spawn(300, 0, -10, 90, 3, 18, pat);
      for (let i = 0; i < 20; i++) pool.advance(1 / 60, bounds);
      const out: number[] = [];
      pool.forEachActive((e) => out.push(e.x, e.y, e.ageTicks));
      return out;
    };
    expect(run()).toEqual(run());
  });
});
