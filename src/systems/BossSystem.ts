import type { BulletPool } from '../entities/BulletPool';
import type { EnemyPool } from '../entities/EnemyPool';
import type { BossDef, BossPhaseDef, Pattern } from '../content/types';
import { getPattern, getEnemyDef } from '../content';
import { emitPattern } from './PatternSystem';
import { Rng } from '../services/Rng';

/**
 * Contexto opcional injetado por tick (P4-02b): a pool de inimigos para invocar
 * adds. O Rng de movimento é interno ao BossSystem (derivado da seed da run),
 * isolado do fluxo principal — assim chefes sem teleporte não alteram o stream
 * da simulação (ver docs/TECH_DECISIONS.md).
 */
export interface BossTickContext {
  readonly enemies?: EnemyPool;
}

/** Estado de runtime de uma parte destrutível (P4-02b-04). */
export interface BossPart {
  /** Posição absoluta (centro do chefe + offset), atualizada por tick. */
  x: number;
  y: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly radius: number;
  hp: number;
  readonly maxHp: number;
  alive: boolean;
  readonly pattern: Pattern | null;
  readonly scorePerDefeat: number;
}

/**
 * Boss — estado do chefe (puro, sem Phaser). Tem vida, fase atual e duas
 * "idades": `phaseAge` (reinicia a cada fase, controla o timing do padrão) e
 * `globalAge` (controla o vaivém). `onHit` aplica dano ao NÚCLEO e cruza os
 * thresholds de fase (P4-02b-01: N fases, thresholds em `phaseThresholds`).
 */
export class Boss {
  x = 0;
  y = 0;
  hp = 0;
  maxHp = 0;
  radius = 0;
  alive = false;
  defeated = false;
  phaseIndex = 0;
  phaseAge = 0;
  globalAge = 0;
  /** Limiares inferiores de HP% por fase (última = 0). Definidos no spawn. */
  phaseThresholds: readonly number[] = [];

  /**
   * Aplica dano ao núcleo. Avança de fase ao cruzar cada threshold (mesmo ponto
   * lógico de antes: dentro do golpe). Retorna true se derrotado neste golpe.
   */
  onHit(damage: number): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    // Avança enquanto cruzou o threshold da fase atual e ainda há fase à frente.
    const last = this.phaseThresholds.length - 1;
    while (
      this.phaseIndex < last &&
      this.hp > 0 &&
      this.hp <= this.maxHp * (this.phaseThresholds[this.phaseIndex] ?? 0)
    ) {
      this.phaseIndex++;
      this.phaseAge = 0;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.defeated = true;
      return true;
    }
    return false;
  }
}

/**
 * BossSystem — entrada, movimento, fases e mecânicas do chefe (P4-02b),
 * determinístico e headless. Cada fase (`BossDef.phases`) traz um padrão e,
 * opcionalmente, escudo, adds, partes destrutíveis e modo de movimento. A
 * colisão tiro↔chefe/parte e a pontuação ficam fora (CollisionSystem / dono).
 */
export class BossSystem {
  readonly boss = new Boss();
  private readonly phasePatterns: Pattern[];
  private readonly fieldWidth: number;
  private spawned = false;
  /** Fase cujas mecânicas estão montadas (-1 = nenhuma ainda). */
  private activePhase = -1;
  private readonly rng: Rng;

  // --- Escudo (P4-02b-02) ---
  private _shieldActive = false;
  private _shieldHp = 0;
  private _shieldMaxHp = 0;
  /** phaseAge em que o escudo quebrou (-1 = não quebrou nesta fase). */
  private shieldBrokenAtAge = -1;

  // --- Partes destrutíveis (P4-02b-04) ---
  private _parts: BossPart[] = [];

  // --- Adds (P4-02b-03) ---
  private addsLastSpawnAge = -1;

  // --- Teleporte (P4-02b-05) ---
  private _telegraphActive = false;
  private _teleDestX = 0;
  private _teleDestY = 0;

  /**
   * @param autoEnter true (campanha): entra sozinho ao atingir def.enterTick.
   *   false (Endless/rush): o dono chama spawnNow() quando o encontro começa.
   * @param rngSeed seed do Rng de movimento (teleporte). Derivada da run.
   */
  constructor(
    private readonly def: BossDef,
    private readonly centerX: number,
    private readonly autoEnter = true,
    rngSeed = 0,
  ) {
    this.phasePatterns = def.phases.map((p) => getPattern(p.patternId));
    this.fieldWidth = centerX * 2;
    this.rng = new Rng((rngSeed ^ 0x7e1e7) >>> 0);
  }

  /** Força a entrada imediata do chefe (usado pelos diretores). */
  spawnNow(): void {
    if (!this.spawned) this.spawn();
  }

  /** Avança o chefe um tick: entra (se auto), move, mecânicas, emite. */
  update(
    currentTick: number,
    enemyBullets: BulletPool,
    playerX: number,
    playerY: number,
    ctx?: BossTickContext,
  ): void {
    if (!this.spawned && this.autoEnter && currentTick >= this.def.enterTick) {
      this.spawn();
    }
    if (!this.boss.alive) return;

    // Reconcilia mecânicas se a fase mudou (transição feita por onHit no tick
    // anterior, durante a colisão). Determinístico: função pura do phaseIndex.
    if (this.boss.phaseIndex !== this.activePhase) {
      this.enterPhase(this.boss.phaseIndex);
    }
    const phase = this.def.phases[this.boss.phaseIndex]!;

    this.updateMovement(phase);
    this.updateShield(phase);
    this.updateParts(enemyBullets);
    this.updateAdds(phase, ctx);

    // Padrão da fase atual, com idade local da fase.
    const pattern = this.phasePatterns[this.boss.phaseIndex] ?? this.phasePatterns[0];
    if (pattern) {
      emitPattern(pattern, this.boss.x, this.boss.y, this.boss.phaseAge, enemyBullets, playerX, playerY);
    }

    this.boss.phaseAge++;
    this.boss.globalAge++;
  }

  /** Já entrou e ainda está vivo? */
  get active(): boolean {
    return this.boss.alive;
  }

  /** Pontos por derrotar este chefe. */
  get defeatScore(): number {
    return this.def.defeatScore;
  }

  // ---- Escudo (acessado por CollisionSystem e render) ----

  get shieldActive(): boolean {
    return this._shieldActive;
  }
  get shieldHp(): number {
    return this._shieldHp;
  }
  get shieldMaxHp(): number {
    return this._shieldMaxHp;
  }

  /** Dano de um tiro no escudo ativo (1). Quebra ao zerar; excedente descartado. */
  hitShield(): void {
    if (!this._shieldActive) return;
    this._shieldHp -= 1;
    if (this._shieldHp <= 0) {
      this._shieldHp = 0;
      this._shieldActive = false;
      this.shieldBrokenAtAge = this.boss.phaseAge;
    }
  }

  // ---- Partes (acessadas por CollisionSystem e render) ----

  get parts(): readonly BossPart[] {
    return this._parts;
  }

  /** Núcleo vulnerável? Falso enquanto houver parte viva na fase. */
  get coreVulnerable(): boolean {
    for (const p of this._parts) if (p.alive) return false;
    return true;
  }

  // ---- Teleporte (acessado por render) ----

  get telegraphActive(): boolean {
    return this._telegraphActive;
  }
  get teleportDestX(): number {
    return this._teleDestX;
  }
  get teleportDestY(): number {
    return this._teleDestY;
  }

  /** Limpa os adds ainda vivos invocados por este chefe (fim de encontro). */
  cleanupAdds(enemies: EnemyPool): void {
    enemies.forEachActive((e) => {
      if (e.summonedByBoss) enemies.killAndRecycle(e);
    });
  }

  // ---- internos ----

  private spawn(): void {
    this.spawned = true;
    this.boss.alive = true;
    this.boss.defeated = false;
    this.boss.hp = this.def.hp;
    this.boss.maxHp = this.def.hp;
    this.boss.radius = this.def.radiusPx;
    this.boss.x = this.centerX;
    this.boss.y = this.def.homeY;
    this.boss.phaseIndex = 0;
    this.boss.phaseAge = 0;
    this.boss.globalAge = 0;
    this.boss.phaseThresholds = this.def.phases.map((p) => p.untilHpPct);
    this.activePhase = -1; // força enterPhase(0) no primeiro update
  }

  /** (Re)monta as mecânicas opcionais da fase `i`. Fora do loop quente. */
  private enterPhase(i: number): void {
    this.activePhase = i;
    const phase = this.def.phases[i]!;

    // Escudo.
    if (phase.shield) {
      this._shieldActive = true;
      this._shieldHp = phase.shield.hp;
      this._shieldMaxHp = phase.shield.hp;
      this.shieldBrokenAtAge = -1;
    } else {
      this._shieldActive = false;
      this._shieldHp = 0;
      this._shieldMaxHp = 0;
      this.shieldBrokenAtAge = -1;
    }

    // Partes destrutíveis.
    this._parts = (phase.parts ?? []).map((pd) => ({
      x: this.boss.x + pd.offsetXPx,
      y: this.boss.y + pd.offsetYPx,
      offsetX: pd.offsetXPx,
      offsetY: pd.offsetYPx,
      radius: pd.radiusPx,
      hp: pd.hp,
      maxHp: pd.hp,
      alive: true,
      pattern: pd.patternId ? getPattern(pd.patternId) : null,
      scorePerDefeat: pd.scorePerDefeat ?? this.def.scorePerPartDefeat ?? 0,
    }));

    // Adds: zera a cadência (próxima invocação por phaseAge).
    this.addsLastSpawnAge = -1;

    // Teleporte: limpa telegraph (posição é mantida até o primeiro salto).
    this._telegraphActive = false;
  }

  private updateMovement(phase: BossPhaseDef): void {
    const mv = phase.movement;
    if (mv && mv.type === 'teleport') {
      this.updateTeleport(mv);
      return;
    }
    // Vaivém horizontal suave em torno do centro do campo (default).
    const sweepPhase = (2 * Math.PI * this.boss.globalAge) / this.def.sweepPeriodTicks;
    this.boss.x = this.centerX + this.def.sweepAmplitudePx * Math.sin(sweepPhase);
    this.boss.y = this.def.homeY;
  }

  private updateTeleport(mv: {
    intervalTicks: number;
    telegraphTicks: number;
    regionPadPx: number;
  }): void {
    const a = this.boss.phaseAge;
    const interval = mv.intervalTicks;
    const intoCycle = a % interval;
    const telegraphStart = interval - mv.telegraphTicks;

    // Início do telegraph: sorteia destino (único consumo de Rng por ciclo).
    if (a >= telegraphStart && intoCycle === telegraphStart) {
      const pad = mv.regionPadPx;
      this._teleDestX = this.rng.range(pad, this.fieldWidth - pad);
      this._teleDestY = this.rng.range(pad, this.def.homeY);
      this._telegraphActive = true;
    }
    // Salto: reposiciona no destino telegrafado.
    if (a > 0 && intoCycle === 0) {
      this.boss.x = this._teleDestX;
      this.boss.y = this._teleDestY;
      this._telegraphActive = false;
    }
  }

  private updateShield(phase: BossPhaseDef): void {
    const cfg = phase.shield;
    if (!cfg || this._shieldActive) return;
    // Recarga dentro da mesma fase.
    if (cfg.rechargeTicks !== undefined && this.shieldBrokenAtAge >= 0) {
      if (this.boss.phaseAge - this.shieldBrokenAtAge >= cfg.rechargeTicks) {
        this._shieldActive = true;
        this._shieldHp = cfg.hp;
        this.shieldBrokenAtAge = -1;
      }
    }
  }

  private updateParts(enemyBullets: BulletPool): void {
    for (const p of this._parts) {
      p.x = this.boss.x + p.offsetX;
      p.y = this.boss.y + p.offsetY;
      if (p.alive && p.pattern) {
        emitPattern(p.pattern, p.x, p.y, this.boss.phaseAge, enemyBullets, p.x, p.y);
      }
    }
  }

  private updateAdds(phase: BossPhaseDef, ctx?: BossTickContext): void {
    const cfg = phase.adds;
    const enemies = ctx?.enemies;
    if (!cfg || !enemies) return;
    const a = this.boss.phaseAge;
    if (a <= 0 || a % cfg.intervalTicks !== 0) return;
    if (a === this.addsLastSpawnAge) return;
    this.addsLastSpawnAge = a;

    // Conta adds vivos deste chefe (respeita maxAlive).
    let aliveAdds = 0;
    enemies.forEachActive((e) => {
      if (e.summonedByBoss) aliveAdds++;
    });

    const def = getEnemyDef(cfg.enemyId);
    const pattern = getPattern(def.patternId);
    const spacing = 90;
    const margin = 40;
    for (let i = 0; i < cfg.count; i++) {
      if (aliveAdds >= cfg.maxAlive) break;
      const ox = (i - (cfg.count - 1) / 2) * spacing;
      const x = Math.min(this.fieldWidth - margin, Math.max(margin, this.boss.x + ox));
      const e = enemies.spawn(x, this.boss.y, 0, def.speedYPxPerSec, def.hp, def.radiusPx, pattern);
      if (!e) break; // pool cheio: falha graciosa, sem alocação
      e.shape = def.shape ?? 'circle';
      e.color = def.color ?? '#ff5d8f';
      e.summonedByBoss = true;
      aliveAdds++;
    }
  }
}
