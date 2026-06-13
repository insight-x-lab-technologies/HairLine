import type { BulletPool } from '../entities/BulletPool';
import type { EnemyPool } from '../entities/EnemyPool';
import type { GameState } from '../sim/GameState';
import type { StageDef } from '../content/types';
import { getWave, getBoss } from '../content';
import { SpawnSystem } from './SpawnSystem';
import { BossSystem, type Boss } from './BossSystem';

/**
 * Progresso do estágio exposto ao render (P4-04b-02). `section` é 1-based para
 * exibição ("ONDA 2/3"). `null` fora do modo `stage` (ver `Simulation`).
 */
export interface StageProgress {
  /** Índice 1-based da seção atual. */
  readonly section: number;
  /** Total de seções do estágio. */
  readonly total: number;
  /** Tipo da seção atual. */
  readonly kind: 'wave' | 'boss';
  /** Nome legível do estágio. */
  readonly stageName: string;
}

/**
 * StageDirector — executa um estágio curado (P4-04b-01), seção a seção, headless
 * e determinístico. Mesmo precedente do `BossRushDirector`: cria os sistemas de
 * spawn/chefe sob demanda na transição de seção (alocação fora do loop quente é
 * aceitável aqui).
 *
 * A seção de onda termina quando a onda spawnou tudo (`SpawnSystem.isFinished`)
 * e o pool de inimigos esvazia (`enemies.activeCount === 0`); a de chefe, ao
 * derrotá-lo (somando `defeatScore`). Quando a última seção fecha, `completed`
 * fica true — a `Simulation` converte em vitória.
 *
 * Espelha as fases do tick da `Simulation` (spawn → chefe → fim), por isso expõe
 * três métodos chamados em pontos fixos do `tick`, preservando a ordem
 * determinística (docs/ARCHITECTURE.md §Determinismo).
 */
export class StageDirector {
  private index = 0;
  private spawner: SpawnSystem | null = null;
  private bossSys: BossSystem | null = null;
  private _completed = false;

  constructor(
    private readonly stage: StageDef,
    private readonly centerX: number,
    private readonly seed: number,
  ) {}

  get completed(): boolean {
    return this._completed;
  }

  /** Índice 0-based da seção atual (dobrado no checksum da Simulation). */
  get sectionIndex(): number {
    return this.index;
  }

  /** Chefe ativo da seção atual (ou null) — para render/colisão. */
  get boss(): Boss | null {
    return this.bossSys?.boss ?? null;
  }

  /** BossSystem ativo (mecânicas P4-02b / hash), ou null. */
  get currentSystem(): BossSystem | null {
    return this.bossSys;
  }

  /** Progresso legível (P4-04b-02). Clampa o índice na última seção ao concluir. */
  get progress(): StageProgress {
    const i = Math.min(this.index, this.stage.sections.length - 1);
    const section = this.stage.sections[i]!;
    return {
      section: i + 1,
      total: this.stage.sections.length,
      kind: section.type,
      stageName: this.stage.name,
    };
  }

  /** Fase de spawn (início do tick): spawna a onda da seção atual. No-op em chefe. */
  spawnPhase(currentTick: number, enemies: EnemyPool): void {
    if (this._completed) return;
    const section = this.stage.sections[this.index];
    if (!section || section.type !== 'wave') return;
    if (!this.spawner) this.spawner = new SpawnSystem(getWave(section.waveId));
    this.spawner.update(currentTick, enemies);
  }

  /** Fase de chefe (meio do tick): cria-o sob demanda e o avança. No-op em onda. */
  bossPhase(
    currentTick: number,
    enemyBullets: BulletPool,
    playerX: number,
    playerY: number,
    enemies: EnemyPool,
  ): void {
    if (this._completed) return;
    const section = this.stage.sections[this.index];
    if (!section || section.type !== 'boss') return;
    if (!this.bossSys) {
      // Seed de movimento isolada e determinística por posição na sequência
      // (mesmo esquema do BossRushDirector).
      const rngSeed = (this.seed ^ (this.index * 0x9e3779b1)) >>> 0;
      this.bossSys = new BossSystem(getBoss(section.bossId), this.centerX, false, rngSeed);
      this.bossSys.spawnNow();
    }
    this.bossSys.update(currentTick, enemyBullets, playerX, playerY, { enemies });
  }

  /**
   * Fim do tick (após colisões): conclui a seção atual e avança quando devido.
   * Onda: termina com spawner esgotado + pool vazio. Chefe: ao ser derrotado
   * (soma `defeatScore` e limpa adds, como o BossRushDirector).
   */
  endPhase(enemies: EnemyPool, state: GameState): void {
    if (this._completed) return;
    const section = this.stage.sections[this.index];
    if (!section) {
      this._completed = true;
      return;
    }
    if (section.type === 'wave') {
      if (this.spawner && this.spawner.isFinished && enemies.activeCount === 0) {
        this.spawner = null;
        this.advance();
      }
    } else if (this.bossSys && this.bossSys.boss.defeated) {
      state.addScore(this.bossSys.defeatScore);
      this.bossSys.cleanupAdds(enemies);
      this.bossSys = null;
      this.advance();
    }
  }

  private advance(): void {
    this.index++;
    if (this.index >= this.stage.sections.length) this._completed = true;
  }
}
