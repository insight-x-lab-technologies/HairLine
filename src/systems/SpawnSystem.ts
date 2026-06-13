import type { EnemyPool } from '../entities/EnemyPool';
import type { Wave, WaveEntry } from '../content/types';
import { getEnemyDef, getPattern } from '../content';

/**
 * SpawnSystem — executa uma onda definida em JSON (docs/02 §3.2).
 *
 * A cada tick, spawna as entradas cujo `tick` já chegou, resolvendo o tipo de
 * inimigo e o padrão de bala a partir do registro de conteúdo. Determinístico:
 * entradas em ordem de tick (e ordem original para empates); usa `<= tick` para
 * não perder spawns caso a simulação avance vários ticks de uma vez.
 *
 * Não usa Rng nesta fatia (ondas autorais); variedade procedural por seed entra
 * com o modo Endless/Diário (Fases 2–3).
 */
export class SpawnSystem {
  private readonly entries: readonly WaveEntry[];
  private next = 0;

  constructor(wave: Wave) {
    // Cópia ordenada por tick, mantendo a ordem original em empates (estável).
    this.entries = [...wave.entries].sort((a, b) => a.tick - b.tick);
  }

  /** Spawna todas as entradas devidas até `currentTick`. */
  update(currentTick: number, enemies: EnemyPool): void {
    while (this.next < this.entries.length && this.entries[this.next]!.tick <= currentTick) {
      this.spawnEntry(this.entries[this.next]!, enemies);
      this.next++;
    }
  }

  get isFinished(): boolean {
    return this.next >= this.entries.length;
  }

  private spawnEntry(entry: WaveEntry, enemies: EnemyPool): void {
    const def = getEnemyDef(entry.enemyId);
    const pattern = getPattern(def.patternId);
    const e = enemies.spawn(entry.x, entry.y, 0, def.speedYPxPerSec, def.hp, def.radiusPx, pattern);
    if (e) {
      e.shape = def.shape ?? 'circle';
      e.color = def.color ?? '#ff5d8f';
    }
  }
}
