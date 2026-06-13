import { describe, it, expect } from 'vitest';
import { EndlessSpawnSystem } from '../src/systems/EndlessSpawnSystem';
import { DifficultySystem, type DifficultyConfig } from '../src/systems/DifficultySystem';
import { EnemyPool } from '../src/entities/EnemyPool';
import { Rng } from '../src/services/Rng';

const cfg: DifficultyConfig = {
  rampTicks: 1500,
  baseSpawnIntervalTicks: 80,
  minSpawnIntervalTicks: 20,
  spawnIntervalDecayPerLevel: 10,
  enemySpeedMulPerLevel: 0.1,
  enemyHpBonusPerLevel: 1,
  tiers: [
    { unlockLevel: 0, enemyIds: ['drone'] },
    { unlockLevel: 2, enemyIds: ['sniper'] },
  ],
};

function makeSpawner(): EndlessSpawnSystem {
  return new EndlessSpawnSystem(new DifficultySystem(cfg), 720, 40);
}

const formCfg: DifficultyConfig = {
  ...cfg,
  formationFromLevel: 0,
  formationChance: 1, // sempre formação, para o teste
  formationSizeMin: 4,
  formationSizeMax: 4,
  formationSpacingPx: 50,
};

describe('EndlessSpawnSystem — spawn procedural determinístico (Fase 2)', () => {
  it('spawna inimigos ao longo do tempo na cadência base (nível 0)', () => {
    const spawner = makeSpawner();
    const enemies = new EnemyPool(256);
    const rng = new Rng(1);
    // intervalo base 80; primeira leva após o atraso inicial.
    for (let t = 0; t < 80 * 5; t++) spawner.update(t, enemies, rng);
    // ~5 inimigos em 5 intervalos (alguns ainda na tela, todos spawnados).
    expect(enemies.activeCount).toBeGreaterThanOrEqual(4);
  });

  it('no nível 0 só aparecem inimigos desbloqueados (drone)', () => {
    const spawner = makeSpawner();
    const enemies = new EnemyPool(256);
    const rng = new Rng(7);
    for (let t = 0; t < 600; t++) spawner.update(t, enemies, rng);
    let total = 0;
    enemies.forEachActive((e) => {
      total++;
      // drone tem padrão 'fan' (ver dados); sniper teria 'aimed'.
      expect(e.pattern?.id).toBe('fan');
    });
    expect(total).toBeGreaterThan(0);
  });

  it('spawna dentro das margens horizontais do campo', () => {
    const spawner = makeSpawner();
    const enemies = new EnemyPool(256);
    const rng = new Rng(123);
    for (let t = 0; t < 1200; t++) spawner.update(t, enemies, rng);
    enemies.forEachActive((e) => {
      expect(e.x).toBeGreaterThanOrEqual(40);
      expect(e.x).toBeLessThanOrEqual(720 - 40);
    });
  });

  it('com formationChance=1 spawna vários inimigos de uma vez (formação)', () => {
    const spawner = new EndlessSpawnSystem(new DifficultySystem(formCfg), 720, 40);
    const enemies = new EnemyPool(256);
    const rng = new Rng(3);
    // até o primeiro disparo (cooldown inicial = baseSpawnInterval 80)
    for (let t = 0; t <= 80; t++) spawner.update(t, enemies, rng);
    expect(enemies.activeCount).toBe(4); // formação de tamanho 4
    // todos dentro do campo
    enemies.forEachActive((e) => {
      expect(e.x).toBeGreaterThanOrEqual(40);
      expect(e.x).toBeLessThanOrEqual(680);
    });
  });

  it('formação é determinística para a mesma seed', () => {
    const run = (): number => {
      const spawner = new EndlessSpawnSystem(new DifficultySystem(formCfg), 720, 40);
      const enemies = new EnemyPool(256);
      const rng = new Rng(9);
      for (let t = 0; t <= 200; t++) spawner.update(t, enemies, rng);
      let sum = 0;
      enemies.forEachActive((e) => (sum += Math.round(e.x) + Math.round(e.y)));
      return sum;
    };
    expect(run()).toBe(run());
  });

  it('é determinístico: mesma seed → mesmos inimigos (tipo e posição)', () => {
    const run = (): Array<[number, string]> => {
      const spawner = makeSpawner();
      const enemies = new EnemyPool(256);
      const rng = new Rng(2024);
      for (let t = 0; t < 1000; t++) spawner.update(t, enemies, rng);
      const out: Array<[number, string]> = [];
      enemies.forEachActive((e) => out.push([Math.round(e.x), e.pattern?.id ?? '']));
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('spawna mais rápido em níveis altos (cadência menor)', () => {
    const enemies = new EnemyPool(2048);
    const rng = new Rng(5);
    const spawner = makeSpawner();
    // Conta spawns numa janela no nível alto vs nível 0, em janelas iguais.
    let low = 0;
    let high = 0;
    const window = 600;
    for (let t = 0; t < window; t++) {
      const before = enemies.activeCount;
      spawner.update(t, enemies, rng);
      if (enemies.activeCount > before) low++;
    }
    const enemies2 = new EnemyPool(2048);
    const spawner2 = makeSpawner();
    const baseTick = cfg.rampTicks * 6; // nível 6 → cadência no piso
    for (let t = baseTick; t < baseTick + window; t++) {
      const before = enemies2.activeCount;
      spawner2.update(t, enemies2, rng);
      if (enemies2.activeCount > before) high++;
    }
    expect(high).toBeGreaterThan(low);
  });
});
