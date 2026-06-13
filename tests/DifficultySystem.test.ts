import { describe, it, expect } from 'vitest';
import { DifficultySystem, type DifficultyConfig } from '../src/systems/DifficultySystem';

const cfg: DifficultyConfig = {
  rampTicks: 1500,
  baseSpawnIntervalTicks: 84,
  minSpawnIntervalTicks: 22,
  spawnIntervalDecayPerLevel: 7,
  enemySpeedMulPerLevel: 0.07,
  enemyHpBonusPerLevel: 1,
  tiers: [
    { unlockLevel: 0, enemyIds: ['drone'] },
    { unlockLevel: 2, enemyIds: ['sniper'] },
    { unlockLevel: 4, enemyIds: ['turret'] },
  ],
};

describe('DifficultySystem — escala por tempo, determinística (Fase 2)', () => {
  const d = new DifficultySystem(cfg);

  it('o nível cresce a cada rampTicks', () => {
    expect(d.level(0)).toBe(0);
    expect(d.level(1499)).toBe(0);
    expect(d.level(1500)).toBe(1);
    expect(d.level(3000)).toBe(2);
  });

  it('o intervalo de spawn diminui com o nível, com piso', () => {
    expect(d.spawnIntervalTicks(0)).toBe(84);
    expect(d.spawnIntervalTicks(1)).toBe(77);
    // cai até o piso e não passa disso
    expect(d.spawnIntervalTicks(100)).toBe(22);
    expect(d.spawnIntervalTicks(100)).toBeGreaterThanOrEqual(cfg.minSpawnIntervalTicks);
  });

  it('velocidade e vida dos inimigos aumentam com o nível', () => {
    expect(d.enemySpeedMul(0)).toBeCloseTo(1, 6);
    expect(d.enemySpeedMul(5)).toBeCloseTo(1.35, 6);
    expect(d.enemyHpBonus(0)).toBe(0);
    expect(d.enemyHpBonus(3)).toBe(3);
  });

  it('a variedade de inimigos desbloqueia por nível (cumulativa)', () => {
    expect(d.enemyPool(0)).toEqual(['drone']);
    expect(d.enemyPool(1)).toEqual(['drone']);
    expect(d.enemyPool(2)).toEqual(['drone', 'sniper']);
    expect(d.enemyPool(3)).toEqual(['drone', 'sniper']);
    expect(d.enemyPool(4)).toEqual(['drone', 'sniper', 'turret']);
    expect(d.enemyPool(99)).toEqual(['drone', 'sniper', 'turret']);
  });
});
