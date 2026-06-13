import type { EnemyPool } from '../entities/EnemyPool';
import type { Rng } from '../services/Rng';
import type { DifficultySystem } from './DifficultySystem';
import { getEnemyDef, getPattern } from '../content';
import { formationOffsets, FORMATION_TYPES } from './Formations';

/**
 * EndlessSpawnSystem — spawn procedural do modo Endless (Fase 2; formações na
 * Fase 4).
 *
 * Em cadência ditada pela DifficultySystem, escolhe um inimigo do conjunto
 * desbloqueado e uma posição horizontal — TUDO via Rng semeável, então a mesma
 * seed gera exatamente a mesma sequência (determinismo, docs/02 §3.1; base do
 * Diário). A partir de certo nível pode spawnar uma FORMAÇÃO (vários inimigos
 * coordenados) em vez de um único.
 */
export class EndlessSpawnSystem {
  /** Ticks até o próximo spawn. */
  private cooldown: number;
  /** Y de entrada (acima do topo do campo). */
  private readonly spawnY = -30;

  constructor(
    private readonly difficulty: DifficultySystem,
    private readonly fieldWidth: number,
    private readonly marginPx: number,
  ) {
    // Pequeno atraso inicial = primeira cadência base (intro respirável).
    this.cooldown = difficulty.spawnIntervalTicks(0);
  }

  update(currentTick: number, enemies: EnemyPool, rng: Rng): void {
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }

    const level = this.difficulty.level(currentTick);
    const pool = this.difficulty.enemyPool(level);
    const id = rng.pick(pool);

    if (this.difficulty.formationsEnabled(level) && rng.chance(this.difficulty.formationChance)) {
      this.spawnFormation(id, level, enemies, rng);
    } else {
      const x = rng.range(this.marginPx, this.fieldWidth - this.marginPx);
      this.spawnEnemy(id, x, this.spawnY, level, enemies);
    }

    this.cooldown = this.difficulty.spawnIntervalTicks(level);
  }

  /** Spawna uma formação coordenada do mesmo tipo de inimigo. */
  private spawnFormation(id: string, level: number, enemies: EnemyPool, rng: Rng): void {
    const type = rng.pick(FORMATION_TYPES);
    const size = this.difficulty.formationSize(rng);
    const offsets = formationOffsets(type, size, this.difficulty.formationSpacingPx);
    // Âncora horizontal que mantém a formação inteira dentro do campo.
    const half = (this.fieldWidth - 2 * this.marginPx) / 2;
    const anchorX = this.fieldWidth / 2 + rng.range(-half * 0.5, half * 0.5);
    for (const off of offsets) {
      const x = Math.min(
        this.fieldWidth - this.marginPx,
        Math.max(this.marginPx, anchorX + off.dx),
      );
      this.spawnEnemy(id, x, this.spawnY + off.dy, level, enemies);
    }
  }

  /** Spawna um inimigo aplicando os multiplicadores de nível e o visual. */
  private spawnEnemy(id: string, x: number, y: number, level: number, enemies: EnemyPool): void {
    const def = getEnemyDef(id);
    const pattern = getPattern(def.patternId);
    const vy = def.speedYPxPerSec * this.difficulty.enemySpeedMul(level);
    const hp = def.hp + this.difficulty.enemyHpBonus(level);
    const e = enemies.spawn(x, y, 0, vy, hp, def.radiusPx, pattern);
    if (e) {
      e.shape = def.shape ?? 'circle';
      e.color = def.color ?? '#ff5d8f';
    }
  }
}
