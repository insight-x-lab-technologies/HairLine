import { describe, it, expect } from 'vitest';
import { StageDirector } from '../src/systems/StageDirector';
import { EnemyPool } from '../src/entities/EnemyPool';
import { BulletPool } from '../src/entities/BulletPool';
import { GameState } from '../src/sim/GameState';
import type { StageDef } from '../src/content/types';
import combat from '../src/data/combat.json';

/**
 * StageDirector (P4-04b-01): executa seções de estágio em sequência. Aqui os
 * testes dirigem as fases do tick na MESMA ordem da Simulation (spawn → avança
 * inimigos → chefe → fim), construindo estágios arbitrários a partir de ids de
 * conteúdo reais.
 */
const BOUNDS = { w: 720, h: 1280 };
const DT = 1 / 60;

function makeState(): GameState {
  return new GameState(combat as unknown as ConstructorParameters<typeof GameState>[0]);
}

/** Um passo lógico: replica a ordem das fases do tick da Simulation. */
function step(
  dir: StageDirector,
  enemies: EnemyPool,
  bullets: BulletPool,
  state: GameState,
  tick: number,
): void {
  dir.spawnPhase(tick, enemies);
  enemies.advance(DT, BOUNDS); // move/envelhece; quem sai pela base é reciclado
  dir.bossPhase(tick, bullets, 360, 1100, enemies);
  dir.endPhase(enemies, state);
}

describe('StageDirector — sequência de seções (P4-04b-01)', () => {
  it('[wave, boss]: o chefe não entra enquanto há inimigo vivo; entra ao limpar', () => {
    const stage: StageDef = {
      id: 'test',
      name: 'Test',
      sections: [
        { type: 'wave', waveId: 'wave-001' },
        { type: 'boss', bossId: 'warden' },
      ],
    };
    const dir = new StageDirector(stage, BOUNDS.w / 2, 1);
    const enemies = new EnemyPool(64);
    const bullets = new BulletPool(2048);
    const state = makeState();

    let sawEnemies = false;
    let sawEnemyWithoutBoss = false;
    let tick = 0;
    // Roda até a onda esvaziar e o chefe ser invocado (ou limite de segurança).
    for (; tick < 3000 && !dir.boss; tick++) {
      step(dir, enemies, bullets, state, tick);
      if (enemies.activeCount > 0) {
        sawEnemies = true;
        // Enquanto há inimigos da onda, o chefe NÃO existe (seção ainda é onda).
        if (!dir.boss) sawEnemyWithoutBoss = true;
        expect(dir.boss).toBeNull();
      }
    }

    expect(sawEnemies).toBe(true);
    expect(sawEnemyWithoutBoss).toBe(true);
    expect(dir.progress.kind).toBe('boss');
    expect(dir.boss).not.toBeNull();
    expect(dir.boss!.alive).toBe(true);

    // Derrota o chefe (atalho de teste) → a seção fecha e o estágio completa.
    dir.boss!.onHit(999);
    step(dir, enemies, bullets, state, tick);
    expect(dir.completed).toBe(true);
    expect(state.score).toBeGreaterThanOrEqual(5000); // defeatScore do warden
  });

  it('[wave, wave]: a 2ª onda só começa após a 1ª esvaziar; o fim completa o estágio', () => {
    const stage: StageDef = {
      id: 'test2',
      name: 'Test 2',
      sections: [
        { type: 'wave', waveId: 'wave-001' },
        { type: 'wave', waveId: 'wave-002' },
      ],
    };
    const dir = new StageDirector(stage, BOUNDS.w / 2, 1);
    const enemies = new EnemyPool(64);
    const bullets = new BulletPool(2048);
    const state = makeState();

    // Detecta a transição para a 2ª seção: o índice passa de 0 → 1.
    let reachedSecond = false;
    for (let tick = 0; tick < 6000 && !dir.completed; tick++) {
      step(dir, enemies, bullets, state, tick);
      if (dir.sectionIndex === 1) reachedSecond = true;
    }
    expect(reachedSecond).toBe(true);
    expect(dir.completed).toBe(true);
  });
});
