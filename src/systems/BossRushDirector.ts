import type { BulletPool } from '../entities/BulletPool';
import type { GameState } from '../sim/GameState';
import { Rng } from '../services/Rng';
import { BossSystem, type Boss } from './BossSystem';
import { getBoss, BOSS_IDS } from '../content';

/**
 * BossRushDirector — modo Boss Rush (docs/04 Fase 4): enfrenta TODOS os chefes
 * em sequência, sem inimigos comuns. Cada chefe entra imediatamente; ao ser
 * derrotado, pontua e o próximo entra. Quando o último cai, `completed` fica
 * true (a Simulation transforma isso em vitória).
 *
 * Determinístico: a ordem dos chefes é embaralhada por um Rng semeado (mesma
 * seed → mesma ordem), preservando a base do Diário/replay.
 */
export class BossRushDirector {
  readonly sequence: string[];
  private index = 0;
  private current: BossSystem | null = null;
  private _completed = false;

  constructor(
    private readonly centerX: number,
    seed: number,
    ids: readonly string[] = BOSS_IDS,
  ) {
    this.sequence = shuffle(ids, new Rng(seed ^ 0x806b));
  }

  get boss(): Boss | null {
    return this.current?.boss ?? null;
  }

  get completed(): boolean {
    return this._completed;
  }

  update(
    currentTick: number,
    enemyBullets: BulletPool,
    playerX: number,
    playerY: number,
    state: GameState,
  ): void {
    if (this._completed) return;

    // Chefe atual derrotado (dano aplicado pela colisão no tick anterior).
    if (this.current && this.current.boss.defeated) {
      state.addScore(this.current.defeatScore);
      this.current = null;
      this.index++;
    }

    if (!this.current) {
      if (this.index >= this.sequence.length) {
        this._completed = true;
        return;
      }
      this.current = new BossSystem(getBoss(this.sequence[this.index]!), this.centerX, false);
      this.current.spawnNow();
    }

    this.current.update(currentTick, enemyBullets, playerX, playerY);
  }
}

/** Fisher-Yates determinístico via Rng. */
function shuffle(ids: readonly string[], rng: Rng): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.intRange(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
