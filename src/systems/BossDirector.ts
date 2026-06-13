import type { BulletPool } from '../entities/BulletPool';
import type { Rng } from '../services/Rng';
import type { GameState } from '../sim/GameState';
import { BossSystem, type Boss } from './BossSystem';
import { getBoss, BOSS_IDS } from '../content';

/**
 * BossDirector — orquestra encontros de chefe no modo Endless (Fase 2).
 *
 * A cada `everyLevels` níveis, invoca um chefe (escolhido por Rng — determinístico,
 * base do Diário) que entra imediatamente. Derrotá-lo concede o bônus de pontos
 * e LIBERA o campo, mas NÃO encerra a run (Endless é infinito; só morrer acaba).
 * Enquanto há chefe, o spawn normal de inimigos é suspenso (luta focada) — quem
 * controla isso é a Simulation, consultando `boss`.
 */
export interface BossDirectorConfig {
  /** Primeiro nível em que um chefe aparece. */
  readonly firstLevel: number;
  /** Intervalo (em níveis) entre encontros. */
  readonly everyLevels: number;
  /** Centro horizontal do campo (px do mundo virtual). */
  readonly centerX: number;
}

export class BossDirector {
  private current: BossSystem | null = null;
  private nextEncounterLevel: number;
  private readonly ids: readonly string[];

  constructor(
    private readonly cfg: BossDirectorConfig,
    ids: readonly string[] = BOSS_IDS,
  ) {
    this.nextEncounterLevel = cfg.firstLevel;
    this.ids = ids;
  }

  /** Chefe ativo (para render e colisão), ou null se não há encontro agora. */
  get boss(): Boss | null {
    return this.current?.boss ?? null;
  }

  update(
    level: number,
    currentTick: number,
    enemyBullets: BulletPool,
    playerX: number,
    playerY: number,
    rng: Rng,
    state: GameState,
  ): void {
    if (this.current) {
      // Derrota detectada (dano aplicado pela colisão no tick anterior).
      if (this.current.boss.defeated) {
        state.addScore(this.current.defeatScore);
        this.current = null;
        this.nextEncounterLevel = level + this.cfg.everyLevels;
        return;
      }
      this.current.update(currentTick, enemyBullets, playerX, playerY);
      return;
    }

    if (level >= this.nextEncounterLevel && this.ids.length > 0) {
      const id = rng.pick(this.ids);
      this.current = new BossSystem(getBoss(id), this.cfg.centerX, false);
      this.current.spawnNow();
      this.current.update(currentTick, enemyBullets, playerX, playerY);
    }
  }
}
