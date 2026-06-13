import { describe, it, expect } from 'vitest';
import { BulletPool } from '../src/entities/BulletPool';

const bounds = { w: 720, h: 1280 };

describe('BulletPool — object pooling determinístico (docs/02 §3.3)', () => {
  it('spawn ativa uma bala e incrementa a contagem ativa', () => {
    const pool = new BulletPool(8);
    expect(pool.activeCount).toBe(0);
    const b = pool.spawn(100, 100, 0, 60, 4);
    expect(b).not.toBeNull();
    expect(pool.activeCount).toBe(1);
  });

  it('step integra a posição por velocidade × dt fixo', () => {
    const pool = new BulletPool(8);
    const b = pool.spawn(100, 100, 30, 60, 4)!;
    pool.step(0.5, bounds);
    expect(b.x).toBeCloseTo(115, 6); // 100 + 30*0.5
    expect(b.y).toBeCloseTo(130, 6); // 100 + 60*0.5
  });

  it('recicla balas que saem do campo (libera o slot)', () => {
    const pool = new BulletPool(8);
    pool.spawn(100, 1270, 0, 1000, 4); // indo para baixo, sai rápido
    expect(pool.activeCount).toBe(1);
    for (let i = 0; i < 60; i++) pool.step(1 / 60, bounds);
    expect(pool.activeCount).toBe(0);
  });

  it('aceleração altera a velocidade ao longo do tempo (balas que aceleram/curvam)', () => {
    const pool = new BulletPool(8);
    // vx=0, ax=100 px/s²; após 1s (passos de 0.5s) vx≈100.
    const b = pool.spawn(100, 100, 0, 0, 4, 100, 0)!;
    pool.step(0.5, bounds);
    pool.step(0.5, bounds);
    expect(b.vx).toBeCloseTo(100, 6);
    expect(b.ax).toBe(100);
  });

  it('sem aceleração informada, ax/ay são zero (compatível com chamadas antigas)', () => {
    const pool = new BulletPool(8);
    const b = pool.spawn(0, 0, 10, 20, 3)!;
    expect(b.ax).toBe(0);
    expect(b.ay).toBe(0);
  });

  it('respeita a capacidade: spawn além do limite retorna null (sem alocar)', () => {
    const pool = new BulletPool(2);
    expect(pool.spawn(0, 0, 0, 1, 1)).not.toBeNull();
    expect(pool.spawn(0, 0, 0, 1, 1)).not.toBeNull();
    expect(pool.spawn(0, 0, 0, 1, 1)).toBeNull();
    expect(pool.activeCount).toBe(2);
    expect(pool.capacity).toBe(2);
  });

  it('reusa slots após reciclagem (pooling real, sem crescer)', () => {
    const pool = new BulletPool(1);
    const first = pool.spawn(100, -100, 0, -1000, 4)!; // já fora pelo topo
    pool.step(1, bounds); // recicla
    expect(pool.activeCount).toBe(0);
    const second = pool.spawn(200, 200, 0, 0, 4);
    expect(second).not.toBeNull();
    expect(second).toBe(first); // mesmo objeto reaproveitado
  });

  it('reset desativa todas as balas', () => {
    const pool = new BulletPool(8);
    pool.spawn(1, 1, 0, 0, 1);
    pool.spawn(2, 2, 0, 0, 1);
    pool.reset();
    expect(pool.activeCount).toBe(0);
  });

  it('forEachActive percorre apenas balas vivas', () => {
    const pool = new BulletPool(8);
    pool.spawn(1, 1, 0, 0, 1);
    pool.spawn(2, 2, 0, 0, 1);
    const xs: number[] = [];
    pool.forEachActive((b) => xs.push(b.x));
    expect(xs.sort()).toEqual([1, 2]);
  });

  it('é determinístico: mesmos spawns e passos = mesmas posições', () => {
    const run = (): number[] => {
      const pool = new BulletPool(16);
      pool.spawn(100, 100, 20, 40, 3);
      pool.spawn(300, 200, -15, 80, 3);
      for (let i = 0; i < 30; i++) pool.step(1 / 60, bounds);
      const out: number[] = [];
      pool.forEachActive((b) => out.push(b.x, b.y));
      return out;
    };
    expect(run()).toEqual(run());
  });
});
