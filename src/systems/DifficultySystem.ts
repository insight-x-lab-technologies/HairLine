/**
 * DifficultySystem — escala de dificuldade do modo Endless (Fase 2).
 *
 * Função PURA e determinística do tempo decorrido (em ticks): define cadência
 * de spawn, multiplicador de velocidade, bônus de vida e a lista de inimigos
 * desbloqueados. O modo Endless fica mais denso/rápido/variado com o tempo
 * (docs/04 Fase 2). Tuning em dados (`src/data/difficulty.json`).
 */
export interface DifficultyTier {
  /** Nível a partir do qual estes inimigos passam a aparecer. */
  readonly unlockLevel: number;
  /** Ids de inimigos adicionados neste tier (incremental, sem repetir). */
  readonly enemyIds: readonly string[];
}

export interface DifficultyConfig {
  /** Ticks para subir um nível de dificuldade. */
  readonly rampTicks: number;
  readonly baseSpawnIntervalTicks: number;
  readonly minSpawnIntervalTicks: number;
  readonly spawnIntervalDecayPerLevel: number;
  readonly enemySpeedMulPerLevel: number;
  readonly enemyHpBonusPerLevel: number;
  readonly tiers: readonly DifficultyTier[];
  /** Formações (opcional): a partir de que nível e com que chance/tamanho. */
  readonly formationFromLevel?: number;
  readonly formationChance?: number;
  readonly formationSizeMin?: number;
  readonly formationSizeMax?: number;
  readonly formationSpacingPx?: number;
}

export class DifficultySystem {
  constructor(private readonly cfg: DifficultyConfig) {}

  /** Nível de dificuldade no tick dado. */
  level(tick: number): number {
    return Math.floor(tick / this.cfg.rampTicks);
  }

  /** Intervalo entre spawns (ticks), decrescente com piso. */
  spawnIntervalTicks(level: number): number {
    const v = this.cfg.baseSpawnIntervalTicks - level * this.cfg.spawnIntervalDecayPerLevel;
    return Math.max(this.cfg.minSpawnIntervalTicks, v);
  }

  /** Multiplicador de velocidade dos inimigos. */
  enemySpeedMul(level: number): number {
    return 1 + level * this.cfg.enemySpeedMulPerLevel;
  }

  /** Bônus de vida somado aos inimigos. */
  enemyHpBonus(level: number): number {
    return level * this.cfg.enemyHpBonusPerLevel;
  }

  /** Inimigos disponíveis no nível (acumula todos os tiers desbloqueados). */
  enemyPool(level: number): string[] {
    const ids: string[] = [];
    for (const tier of this.cfg.tiers) {
      if (tier.unlockLevel <= level) ids.push(...tier.enemyIds);
    }
    // Garante ao menos o primeiro tier (defensivo).
    return ids.length > 0 ? ids : [...(this.cfg.tiers[0]?.enemyIds ?? [])];
  }

  /** Formações habilitadas neste nível? */
  formationsEnabled(level: number): boolean {
    const from = this.cfg.formationFromLevel ?? Infinity;
    return level >= from && (this.cfg.formationChance ?? 0) > 0;
  }

  get formationChance(): number {
    return this.cfg.formationChance ?? 0;
  }

  get formationSpacingPx(): number {
    return this.cfg.formationSpacingPx ?? 60;
  }

  /** Tamanho da formação (inclusive), usando o Rng para variar. */
  formationSize(rng: { intRange(min: number, max: number): number }): number {
    const min = this.cfg.formationSizeMin ?? 3;
    const max = this.cfg.formationSizeMax ?? min;
    return rng.intRange(min, Math.max(min, max));
  }
}
