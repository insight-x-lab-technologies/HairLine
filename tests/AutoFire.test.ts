import { describe, it, expect } from 'vitest';
import { AutoFire, type AutoFireConfig } from '../src/sim/AutoFire';
import { BulletPool } from '../src/entities/BulletPool';

const cfg: AutoFireConfig = {
  intervalTicks: 6,
  speedPxPerSec: 1000,
  radiusPx: 4,
};

describe('AutoFire — tiro automático em cadência fixa (Fase 1; docs/01 §4.2)', () => {
  it('dispara no primeiro tick e depois a cada intervalo (em ticks, não segundos)', () => {
    const pool = new BulletPool(64);
    const gun = new AutoFire(cfg);
    // 7 ticks com intervalo 6 → dispara nos ticks 0 e 6 = 2 balas.
    for (let i = 0; i < 7; i++) gun.tick(pool, 360, 1000);
    expect(pool.activeCount).toBe(2);
  });

  it('a cadência é exatamente intervalTicks', () => {
    const pool = new BulletPool(256);
    const gun = new AutoFire(cfg);
    // 60 ticks → ticks 0,6,...,54 = 10 disparos.
    for (let i = 0; i < 60; i++) gun.tick(pool, 0, 0);
    expect(pool.activeCount).toBe(10);
  });

  it('atira para cima a partir da origem dada, com o raio configurado', () => {
    const pool = new BulletPool(8);
    const gun = new AutoFire(cfg);
    gun.tick(pool, 360, 1000);
    let spawned = 0;
    pool.forEachActive((b) => {
      spawned++;
      expect(b.x).toBe(360);
      expect(b.y).toBe(1000);
      expect(b.vx).toBe(0);
      expect(b.vy).toBe(-1000); // para cima
      expect(b.radius).toBe(4);
    });
    expect(spawned).toBe(1);
  });

  it('não falha quando o pool está cheio (apenas não dispara)', () => {
    const pool = new BulletPool(1);
    const gun = new AutoFire(cfg);
    gun.tick(pool, 0, 0); // enche
    gun.tick(pool, 0, 0); // cooldown ainda ativo, não tenta
    for (let i = 0; i < 6; i++) gun.tick(pool, 0, 0); // chega a hora, mas cheio
    expect(pool.activeCount).toBe(1);
  });

  it('reset zera o cooldown (volta a disparar no próximo tick)', () => {
    const pool = new BulletPool(8);
    const gun = new AutoFire(cfg);
    gun.tick(pool, 0, 0); // dispara, cooldown = 6
    gun.reset();
    gun.tick(pool, 0, 0); // após reset, dispara de novo
    expect(pool.activeCount).toBe(2);
  });

  it('é determinístico: mesma sequência = mesmo número de disparos', () => {
    const run = (): number => {
      const pool = new BulletPool(256);
      const gun = new AutoFire(cfg);
      for (let i = 0; i < 100; i++) gun.tick(pool, 10, 20);
      return pool.activeCount;
    };
    expect(run()).toBe(run());
  });
});
