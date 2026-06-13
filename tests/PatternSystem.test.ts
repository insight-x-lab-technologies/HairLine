import { describe, it, expect } from 'vitest';
import { emitEnemyBullets } from '../src/systems/PatternSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { Enemy } from '../src/entities/EnemyPool';
import type { Pattern } from '../src/content/types';

function enemyWith(pattern: Pattern, x = 100, y = 100, age = 0): Enemy {
  const e = new Enemy();
  e.x = x;
  e.y = y;
  e.alive = true;
  e.pattern = pattern;
  e.ageTicks = age;
  return e;
}

function dirs(pool: BulletPool): Array<{ vx: number; vy: number }> {
  const out: Array<{ vx: number; vy: number }> = [];
  pool.forEachActive((b) => out.push({ vx: b.vx, vy: b.vy }));
  return out;
}

describe('PatternSystem — emitters declarativos (Fase 1; convenção 0°=baixo)', () => {
  it('ring: distribui N balas igualmente em 360°', () => {
    const p: Pattern = {
      id: 'r',
      emitters: [
        {
          type: 'ring',
          count: 4,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
          angleDeg: 0,
        },
      ],
    };
    const pool = new BulletPool(16);
    emitEnemyBullets(enemyWith(p, 0, 0, 0), pool, 0, 0);
    expect(pool.activeCount).toBe(4);
    const d = dirs(pool);
    // 0°=baixo, 90°=direita, 180°=cima, 270°=esquerda
    expect(d[0]!.vx).toBeCloseTo(0, 5);
    expect(d[0]!.vy).toBeCloseTo(100, 5);
    expect(d[1]!.vx).toBeCloseTo(100, 5);
    expect(d[1]!.vy).toBeCloseTo(0, 5);
    expect(d[2]!.vy).toBeCloseTo(-100, 5);
    expect(d[3]!.vx).toBeCloseTo(-100, 5);
  });

  it('salva única (intervalTicks<=0) só dispara na idade startTick', () => {
    const p: Pattern = {
      id: 's',
      emitters: [
        {
          type: 'ring',
          count: 2,
          speed: 100,
          bulletRadius: 5,
          startTick: 5,
          intervalTicks: 0,
          repeat: 1,
        },
      ],
    };
    const pool = new BulletPool(16);
    emitEnemyBullets(enemyWith(p, 0, 0, 4), pool, 0, 0); // antes
    expect(pool.activeCount).toBe(0);
    emitEnemyBullets(enemyWith(p, 0, 0, 5), pool, 0, 0); // na hora
    expect(pool.activeCount).toBe(2);
    emitEnemyBullets(enemyWith(p, 0, 0, 6), pool, 0, 0); // depois
    expect(pool.activeCount).toBe(2);
  });

  it('repeat com intervalo dispara nas idades certas', () => {
    const p: Pattern = {
      id: 'rep',
      emitters: [
        {
          type: 'fan',
          count: 1,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 10,
          repeat: 3,
        },
      ],
    };
    const fireAges: number[] = [];
    for (let age = 0; age <= 40; age++) {
      const pool = new BulletPool(8);
      emitEnemyBullets(enemyWith(p, 0, 0, age), pool, 0, 0);
      if (pool.activeCount > 0) fireAges.push(age);
    }
    expect(fireAges).toEqual([0, 10, 20]); // 3 salvas, não dispara em 30
  });

  it('aimed: aponta para o jogador', () => {
    const p: Pattern = {
      id: 'a',
      emitters: [
        {
          type: 'aimed',
          count: 1,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
        },
      ],
    };
    // jogador diretamente abaixo → bala desce reto
    let pool = new BulletPool(8);
    emitEnemyBullets(enemyWith(p, 100, 100, 0), pool, 100, 500);
    expect(dirs(pool)[0]!.vx).toBeCloseTo(0, 4);
    expect(dirs(pool)[0]!.vy).toBeCloseTo(100, 4);
    // jogador à direita → bala vai para a direita
    pool = new BulletPool(8);
    emitEnemyBullets(enemyWith(p, 100, 100, 0), pool, 500, 100);
    expect(dirs(pool)[0]!.vx).toBeCloseTo(100, 4);
    expect(dirs(pool)[0]!.vy).toBeCloseTo(0, 4);
  });

  it('fan: abre as balas em torno da direção base pelo spread', () => {
    const p: Pattern = {
      id: 'f',
      emitters: [
        {
          type: 'fan',
          count: 3,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
          angleDeg: 0,
          spreadDeg: 90,
        },
      ],
    };
    const pool = new BulletPool(8);
    emitEnemyBullets(enemyWith(p, 0, 0, 0), pool, 0, 0);
    const d = dirs(pool);
    expect(d).toHaveLength(3);
    // -45°, 0°, +45°
    expect(d[0]!.vx).toBeCloseTo(-Math.SQRT1_2 * 100, 4);
    expect(d[1]!.vx).toBeCloseTo(0, 4);
    expect(d[1]!.vy).toBeCloseTo(100, 4);
    expect(d[2]!.vx).toBeCloseTo(Math.SQRT1_2 * 100, 4);
  });

  it('angleStepDeg gira a direção base a cada salva (espiral)', () => {
    const p: Pattern = {
      id: 'spin',
      emitters: [
        {
          type: 'ring',
          count: 1,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 1,
          repeat: 4,
          angleDeg: 0,
          angleStepDeg: 90,
        },
      ],
    };
    const pool = new BulletPool(16);
    // salvas nas idades 0..3 → base 0°, 90°, 180°, 270°
    for (let age = 0; age < 4; age++) emitEnemyBullets(enemyWith(p, 0, 0, age), pool, 0, 0);
    const d = dirs(pool);
    expect(d[0]!.vy).toBeCloseTo(100, 4); // 0° baixo
    expect(d[1]!.vx).toBeCloseTo(100, 4); // 90° direita
    expect(d[2]!.vy).toBeCloseTo(-100, 4); // 180° cima
    expect(d[3]!.vx).toBeCloseTo(-100, 4); // 270° esquerda
  });

  it('accel dá aceleração na direção da bala', () => {
    const p: Pattern = {
      id: 'acc',
      emitters: [
        {
          type: 'ring',
          count: 1,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
          angleDeg: 0, // baixo → dir (0,1)
          accel: 200,
        },
      ],
    };
    const pool = new BulletPool(8);
    emitEnemyBullets(enemyWith(p, 0, 0, 0), pool, 0, 0);
    let ax = -1;
    let ay = -1;
    pool.forEachActive((b) => {
      ax = b.ax;
      ay = b.ay;
    });
    expect(ax).toBeCloseTo(0, 5);
    expect(ay).toBeCloseTo(200, 5); // acelera para baixo
  });

  it('speedStep e radiusStep variam por bala (camadas)', () => {
    const p: Pattern = {
      id: 'layer',
      emitters: [
        {
          type: 'fan',
          count: 3,
          speed: 100,
          bulletRadius: 4,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
          angleDeg: 0,
          spreadDeg: 0, // todas para baixo, só variando velocidade/raio
          speedStep: 50,
          radiusStep: 2,
        },
      ],
    };
    const pool = new BulletPool(8);
    emitEnemyBullets(enemyWith(p, 0, 0, 0), pool, 0, 0);
    const speeds: number[] = [];
    const radii: number[] = [];
    pool.forEachActive((b) => {
      speeds.push(Math.round(b.vy));
      radii.push(b.radius);
    });
    expect(speeds.sort((a, b) => a - b)).toEqual([100, 150, 200]);
    expect(radii.sort((a, b) => a - b)).toEqual([4, 6, 8]);
  });

  it('aimOffsetDeg desloca a direção base (ex.: mira com desvio)', () => {
    const p: Pattern = {
      id: 'off',
      emitters: [
        {
          type: 'aimed',
          count: 1,
          speed: 100,
          bulletRadius: 5,
          startTick: 0,
          intervalTicks: 0,
          repeat: 1,
          aimOffsetDeg: 90,
        },
      ],
    };
    const pool = new BulletPool(8);
    // jogador diretamente abaixo (base 0°) + offset 90° → direita
    emitEnemyBullets(enemyWith(p, 100, 100, 0), pool, 100, 500);
    expect(dirs(pool)[0]!.vx).toBeCloseTo(100, 4);
    expect(dirs(pool)[0]!.vy).toBeCloseTo(0, 4);
  });

  it('inimigo sem padrão não emite (defensivo)', () => {
    const pool = new BulletPool(8);
    const e = new Enemy();
    e.alive = true;
    e.pattern = null;
    emitEnemyBullets(e, pool, 0, 0);
    expect(pool.activeCount).toBe(0);
  });
});
