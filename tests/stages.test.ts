import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { getStage, getWave } from '../src/content';

/**
 * Estágios curados (P4-04b-03): trava o que é OBJETIVO (picos de pool dentro do
 * orçamento, hash golden estável, ordem de densidade crescente). A dificuldade
 * percebida fica para o playtest manual (anotada no PR).
 */
const ENEMY_CAPACITY = 64;
const ENEMY_BULLET_CAPACITY = 2048;
const STAGES = ['stage-001', 'stage-002', 'stage-003'];

function runStage(stageId: string, ticks: number): { hash: string; peakEnemies: number; peakBullets: number } {
  const sim = new Simulation({ seed: 0xabcdef, mode: 'stage', stageId });
  const input = { moveX: 360, moveY: 1100, focus: false };
  let peakEnemies = 0;
  let peakBullets = 0;
  for (let i = 0; i < ticks; i++) {
    sim.tick(input);
    peakEnemies = Math.max(peakEnemies, sim.enemies.activeCount);
    peakBullets = Math.max(peakBullets, sim.enemyBullets.activeCount);
  }
  return { hash: sim.hashState(), peakEnemies, peakBullets };
}

/** Total de entries de onda do estágio (proxy objetivo de densidade). */
function waveEntries(stageId: string): number {
  return getStage(stageId)
    .sections.filter((s) => s.type === 'wave')
    .reduce((n, s) => n + (s.type === 'wave' ? getWave(s.waveId).entries.length : 0), 0);
}

describe('estágios curados — orçamento e determinismo (P4-04b-03)', () => {
  for (const id of STAGES) {
    it(`${id}: spawna, respeita o orçamento de pools e tem hash golden estável`, () => {
      const a = runStage(id, 1200);
      const b = runStage(id, 1200);
      expect(a.hash).toBe(b.hash); // golden: mesma seed → mesmo hash
      expect(a.peakEnemies).toBeGreaterThan(0); // de fato spawnou conteúdo
      expect(a.peakEnemies).toBeLessThanOrEqual(ENEMY_CAPACITY);
      expect(a.peakBullets).toBeLessThanOrEqual(ENEMY_BULLET_CAPACITY);
    });
  }

  it('a densidade (entries de onda) cresce de stage-001 → stage-003', () => {
    const e1 = waveEntries('stage-001');
    const e2 = waveEntries('stage-002');
    const e3 = waveEntries('stage-003');
    expect(e1).toBeLessThan(e2);
    expect(e2).toBeLessThan(e3);
  });

  it('cada estágio usa um chefe distinto (identidade própria)', () => {
    const bossOf = (id: string): string =>
      getStage(id).sections.flatMap((s) => (s.type === 'boss' ? [s.bossId] : []))[0] ?? '';
    const bosses = STAGES.map(bossOf);
    expect(new Set(bosses).size).toBe(STAGES.length);
  });
});
