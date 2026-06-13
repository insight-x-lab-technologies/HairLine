/**
 * GameState — estado de combate da run (Fase 1), puro e determinístico.
 *
 * Concentra vidas, medidor de Foco (carregado por graze — a mecânica central,
 * docs/01 §4.1), pontuação, contagem de graze e game over. Sem Phaser, sem
 * Rng. Tuning vem de dados (`src/data/combat.json`), nunca hardcoded.
 */
export interface CombatConfig {
  readonly lives: number;
  /** Ticks de invulnerabilidade após levar dano. */
  readonly invulnTicks: number;
  readonly focusMax: number;
  readonly focusPerGraze: number;
  /** Folga (px) além da hitbox para contar graze. */
  readonly grazeMarginPx: number;
  readonly scorePerKill: number;
  readonly scorePerGraze: number;
}

export class GameState {
  lives: number;
  score = 0;
  focus = 0;
  grazeCount = 0;
  /** Inimigos abatidos (separado do score para áudio/estatística). */
  kills = 0;
  gameOver = false;
  /** Run terminou em vitória (chefe derrotado)? Distingue de morte. */
  won = false;
  private invulnTimer = 0;

  constructor(private readonly cfg: CombatConfig) {
    this.lives = cfg.lives;
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0;
  }

  /** Graze: carrega Foco (com teto), conta e pontua. */
  addGraze(): void {
    this.focus = Math.min(this.cfg.focusMax, this.focus + this.cfg.focusPerGraze);
    this.grazeCount++;
    this.score += this.cfg.scorePerGraze;
  }

  /** Inimigo abatido: pontua e conta. */
  addKill(): void {
    this.score += this.cfg.scorePerKill;
    this.kills++;
  }

  /** Pontuação avulsa (ex.: balas refletidas pelo pulso). */
  addScore(points: number): void {
    this.score += points;
  }

  /** Gasta Foco se houver o suficiente. Retorna true se gastou. */
  spendFocus(cost: number): boolean {
    if (this.focus < cost) return false;
    this.focus -= cost;
    return true;
  }

  /** Dano no jogador: ignorado se invulnerável ou já em game over. */
  hitPlayer(): void {
    if (this.gameOver || this.invulnerable) return;
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver = true;
      return;
    }
    this.invulnTimer = this.cfg.invulnTicks;
  }

  /** Vitória: chefe derrotado. Encerra a run como vitória. */
  win(): void {
    if (this.gameOver) return;
    this.won = true;
    this.gameOver = true;
  }

  /** Avança temporizadores (1 tick). */
  tickTimers(): void {
    if (this.invulnTimer > 0) this.invulnTimer--;
  }
}
