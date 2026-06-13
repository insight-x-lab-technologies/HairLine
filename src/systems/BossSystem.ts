import type { BulletPool } from '../entities/BulletPool';
import type { BossDef, Pattern } from '../content/types';
import { getPattern } from '../content';
import { emitPattern } from './PatternSystem';

/**
 * Boss — estado do chefe (puro, sem Phaser). Tem vida, fase atual e duas
 * "idades": `phaseAge` (reinicia a cada fase, controla o timing do padrão) e
 * `globalAge` (controla o vaivém). `onHit` aplica dano, troca de fase ao cruzar
 * metade da vida e sinaliza derrota.
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

  /** Aplica dano. Retorna true se derrotado neste golpe. */
  onHit(damage: number): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    // Transição para a fase 2 ao cair abaixo da metade (reinicia o padrão).
    if (this.phaseIndex === 0 && this.hp <= this.maxHp / 2 && this.hp > 0) {
      this.phaseIndex = 1;
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
 * BossSystem — entrada, movimento, troca de fase e emissão de balas do chefe
 * (docs/04 Fase 1: "1 chefe simples com 2 fases"). Determinístico: posição por
 * seno da idade, padrões reusando o PatternSystem. A colisão tiro↔chefe e a
 * pontuação de derrota são tratadas fora (CollisionSystem / Simulation).
 */
export class BossSystem {
  readonly boss = new Boss();
  private readonly phasePatterns: Pattern[];
  private spawned = false;

  /**
   * @param autoEnter true (campanha): entra sozinho ao atingir def.enterTick.
   *   false (Endless): o dono chama spawnNow() quando o encontro começa.
   */
  constructor(
    private readonly def: BossDef,
    private readonly centerX: number,
    private readonly autoEnter = true,
  ) {
    this.phasePatterns = def.phasePatternIds.map((id) => getPattern(id));
  }

  /** Força a entrada imediata do chefe (usado pelo BossDirector no Endless). */
  spawnNow(): void {
    if (!this.spawned) this.spawn();
  }

  /** Avança o chefe um tick: entra (se auto), move, emite. */
  update(currentTick: number, enemyBullets: BulletPool, playerX: number, playerY: number): void {
    if (!this.spawned && this.autoEnter && currentTick >= this.def.enterTick) {
      this.spawn();
    }
    if (!this.boss.alive) return;

    // Vaivém horizontal suave em torno do centro do campo.
    const phase = (2 * Math.PI * this.boss.globalAge) / this.def.sweepPeriodTicks;
    this.boss.x = this.centerX + this.def.sweepAmplitudePx * Math.sin(phase);
    this.boss.y = this.def.homeY;

    // Padrão da fase atual, com idade local da fase.
    const pattern = this.phasePatterns[this.boss.phaseIndex] ?? this.phasePatterns[0];
    if (pattern) {
      emitPattern(
        pattern,
        this.boss.x,
        this.boss.y,
        this.boss.phaseAge,
        enemyBullets,
        playerX,
        playerY,
      );
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
  }
}
