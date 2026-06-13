import { describe, it, expect } from 'vitest';
import { SpawnSystem } from '../src/systems/SpawnSystem';
import { EnemyPool } from '../src/entities/EnemyPool';
import { getWave } from '../src/content';

describe('SpawnSystem — onda dirigida por dados (Fase 1; docs/02 §3.2)', () => {
  it('spawna os inimigos exatamente nos ticks definidos na onda', () => {
    const spawner = new SpawnSystem(getWave('wave-001'));
    const enemies = new EnemyPool(32);

    for (let t = 0; t < 30; t++) spawner.update(t, enemies);
    expect(enemies.activeCount).toBe(0); // nada antes do tick 30

    spawner.update(30, enemies);
    expect(enemies.activeCount).toBe(2); // 2 drones no tick 30
  });

  it('resolve def do inimigo e padrão a partir dos dados', () => {
    const spawner = new SpawnSystem(getWave('wave-001'));
    const enemies = new EnemyPool(32);
    for (let t = 0; t <= 30; t++) spawner.update(t, enemies);

    const xs: number[] = [];
    let hp = -1;
    enemies.forEachActive((e) => {
      xs.push(e.x);
      hp = e.hp;
      expect(e.pattern?.id).toBe('fan'); // drone usa padrão 'fan'
      expect(e.vy).toBeGreaterThan(0); // desce
    });
    expect(xs.sort((a, b) => a - b)).toEqual([220, 500]);
    expect(hp).toBe(3); // hp do drone
  });

  it('processa toda a onda e sinaliza término', () => {
    const spawner = new SpawnSystem(getWave('wave-001'));
    const enemies = new EnemyPool(32);
    expect(spawner.isFinished).toBe(false);
    for (let t = 0; t <= 300; t++) spawner.update(t, enemies);
    expect(spawner.isFinished).toBe(true);
    expect(enemies.activeCount).toBe(5); // 2 drones + 1 turret + 2 snipers
  });

  it('não perde spawns se um tick for pulado (usa <= tick)', () => {
    const spawner = new SpawnSystem(getWave('wave-001'));
    const enemies = new EnemyPool(32);
    spawner.update(35, enemies); // pulou o tick 30
    expect(enemies.activeCount).toBe(2);
  });

  it('é determinístico para a mesma onda', () => {
    const run = (): number => {
      const spawner = new SpawnSystem(getWave('wave-001'));
      const enemies = new EnemyPool(32);
      for (let t = 0; t <= 300; t++) spawner.update(t, enemies);
      let sum = 0;
      enemies.forEachActive((e) => (sum += e.x + e.hp));
      return sum;
    };
    expect(run()).toBe(run());
  });
});
