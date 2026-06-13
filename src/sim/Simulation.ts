import { Rng } from '../services/Rng';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { Player, type Bounds, type PlayerConfig } from './Player';
import { AutoFire, type AutoFireConfig } from './AutoFire';
import { BulletPool } from '../entities/BulletPool';
import { EnemyPool } from '../entities/EnemyPool';
import { SpawnSystem } from '../systems/SpawnSystem';
import { emitEnemyBullets } from '../systems/PatternSystem';
import {
  resolveShotsVsEnemies,
  resolvePlayerVsBullets,
  resolveShotsVsBoss,
} from '../systems/CollisionSystem';
import { updateGraze } from '../systems/GrazeSystem';
import { tryReflectPulse, type ReflectConfig } from '../systems/ReflectPulse';
import { BossSystem, type Boss } from '../systems/BossSystem';
import { BossDirector } from '../systems/BossDirector';
import { BossRushDirector } from '../systems/BossRushDirector';
import { DifficultySystem, type DifficultyConfig } from '../systems/DifficultySystem';
import { EndlessSpawnSystem } from '../systems/EndlessSpawnSystem';
import { GameState, type CombatConfig } from './GameState';
import { getWave, getBoss } from '../content';
import playerData from '../data/player.json';
import combatData from '../data/combat.json';
import difficultyData from '../data/difficulty.json';
import { NEUTRAL_INPUT, type SimInput, type SimulationOptions, type GameMode } from './types';

/** Margem horizontal de spawn de inimigos no modo Endless (px). */
const ENEMY_SPAWN_MARGIN = 40;

/** Orçamentos de pool (máximos vivos simultâneos). */
const PLAYER_SHOT_CAPACITY = 256;
const ENEMY_BULLET_CAPACITY = 2048;
const ENEMY_CAPACITY = 64;
/** Onda e chefe padrão da fatia atual (Endless/Diário escolherão depois). */
const DEFAULT_WAVE_ID = 'wave-001';
const DEFAULT_BOSS_ID = 'warden';

/**
 * Simulation — o "mundo" lógico do jogo, tickável e headless (docs/02 §3.1,
 * docs/03 §5.2).
 *
 * Orquestra todo o jogo em passos fixos: spawn (Endless procedural via Rng ou
 * campanha por onda autoral), nave + tiro, inimigos e seus padrões de bala,
 * chefe (campanha), graze, pulso refletor, colisões e pontuação. Consome
 * aleatoriedade SOMENTE via Rng e expõe um hash de estado reproduzível.
 *
 * Invariante: dado `seed`, `mode` e a mesma sequência de `tick(input)`, dois
 * Simulation em qualquer máquina produzem o mesmo `hashState()` — base do
 * Desafio Diário e do anti-cheat por re-simulação (docs/02 §3.1, §7).
 */
export class Simulation {
  readonly fixedDeltaMs: number;
  readonly fixedDeltaSec: number;
  readonly bounds: Bounds;
  /** Estado autoritativo da nave (lido pelo render). */
  readonly player: Player;
  /** Pool de tiros do jogador (lido pelo render). */
  readonly playerShots: BulletPool;
  /** Pool de balas inimigas (lido pelo render e pelo graze/colisão). */
  readonly enemyBullets: BulletPool;
  /** Pool de inimigos vivos (lido pelo render). */
  readonly enemies: EnemyPool;
  /** Estado de combate: vidas, foco, score, graze, game over (lido pelo HUD). */
  readonly state: GameState;
  /** Sistema do chefe na campanha (entrada automática por tick). */
  readonly bossSystem: BossSystem;
  /** Diretor de encontros de chefe no Endless. */
  readonly bossDirector: BossDirector;
  /** Diretor de chefes em sequência (modo Boss Rush). */
  readonly bossRush: BossRushDirector;
  /** Modo da run. */
  readonly mode: GameMode;
  /** Dica para o render: último pulso refletor ativado (efeito visual). */
  lastReflect: { tick: number; x: number; y: number; radius: number } | null = null;
  private readonly rng: Rng;
  private readonly autoFire: AutoFire;
  private readonly spawner: SpawnSystem;
  private readonly difficulty: DifficultySystem;
  private readonly endlessSpawner: EndlessSpawnSystem;
  private readonly grazeMargin: number;
  private readonly reflectCfg: ReflectConfig;

  private _tickCount = 0;
  /** Checksum acumulado do estado do mundo (FNV-1a de 32 bits). */
  private checksum = 0x811c9dc5; // offset FNV-1a de 32 bits

  constructor(opts: SimulationOptions) {
    const hz = opts.tickRateHz ?? 60;
    this.fixedDeltaMs = 1000 / hz;
    this.fixedDeltaSec = 1 / hz;
    this.bounds = opts.bounds ?? { w: VIRTUAL_WIDTH, h: VIRTUAL_HEIGHT };
    this.rng = new Rng(opts.seed);
    const mods = opts.mods ?? {};

    // Player com velocidade possivelmente modificada (evento semanal).
    const pData = playerData as PlayerConfig;
    this.player = new Player(
      mods.playerSpeedMul
        ? { ...pData, maxSpeedPxPerSec: pData.maxSpeedPxPerSec * mods.playerSpeedMul }
        : pData,
    );
    this.autoFire = new AutoFire((playerData as { autoFire: AutoFireConfig }).autoFire);
    this.playerShots = new BulletPool(PLAYER_SHOT_CAPACITY);
    this.enemyBullets = new BulletPool(ENEMY_BULLET_CAPACITY);
    this.enemies = new EnemyPool(ENEMY_CAPACITY);
    this.mode = opts.mode ?? 'endless';
    this.spawner = new SpawnSystem(getWave(opts.waveId ?? DEFAULT_WAVE_ID));
    this.bossSystem = new BossSystem(getBoss(opts.bossId ?? DEFAULT_BOSS_ID), this.bounds.w / 2);

    // Dificuldade com cadência de spawn modificada (mais/menos densa).
    const baseDiff = difficultyData as DifficultyConfig & {
      bossFirstLevel: number;
      bossEveryLevels: number;
    };
    const diffCfg = mods.spawnIntervalMul
      ? {
          ...baseDiff,
          baseSpawnIntervalTicks: baseDiff.baseSpawnIntervalTicks * mods.spawnIntervalMul,
          minSpawnIntervalTicks: baseDiff.minSpawnIntervalTicks * mods.spawnIntervalMul,
        }
      : baseDiff;
    this.bossDirector = new BossDirector({
      firstLevel: baseDiff.bossFirstLevel,
      everyLevels: baseDiff.bossEveryLevels,
      centerX: this.bounds.w / 2,
    });
    this.bossRush = new BossRushDirector(this.bounds.w / 2, opts.seed);
    this.difficulty = new DifficultySystem(diffCfg);
    this.endlessSpawner = new EndlessSpawnSystem(
      this.difficulty,
      this.bounds.w,
      ENEMY_SPAWN_MARGIN,
    );

    // Combate com regras de pontuação/foco/vidas modificadas.
    const baseCombat = combatData as CombatConfig & ReflectConfig;
    const combat: CombatConfig & ReflectConfig = {
      ...baseCombat,
      scorePerGraze: Math.round(baseCombat.scorePerGraze * (mods.scorePerGrazeMul ?? 1)),
      scorePerKill: Math.round(baseCombat.scorePerKill * (mods.scorePerKillMul ?? 1)),
      focusPerGraze: baseCombat.focusPerGraze * (mods.focusPerGrazeMul ?? 1),
      lives: mods.livesOverride ?? baseCombat.lives,
    };
    this.state = new GameState(combat);
    this.grazeMargin = combat.grazeMarginPx;
    this.reflectCfg = combat;
  }

  get tickCount(): number {
    return this._tickCount;
  }

  /** Nível de dificuldade atual (modo Endless) — para HUD/score. */
  get level(): number {
    return this.difficulty.level(this._tickCount);
  }

  /** Chefe ativo (qualquer modo), ou null se não há — para render/colisão. */
  get boss(): Boss | null {
    if (this.mode === 'endless') return this.bossDirector.boss;
    if (this.mode === 'bossrush') return this.bossRush.boss;
    return this.bossSystem.boss;
  }

  /**
   * Avança a simulação em exatamente um passo lógico fixo.
   * @param input Intenção abstrata do jogador neste tick (padrão: neutra).
   */
  tick(input: SimInput = NEUTRAL_INPUT): void {
    // Após o game over a simulação congela (o render decide a transição).
    if (this.state.gameOver) {
      this._tickCount++;
      return;
    }

    // Ordem de update determinística (docs/02 §3.1):
    //  1) spawn de inimigos (Endless: procedural | campanha: onda | bossrush: nenhum);
    //  2) nave em passo fixo + tiro automático;
    //  3) inimigos emitem balas (função da idade) e então se movem/envelhecem;
    //  4) chefe (campanha / Endless / Boss Rush);
    //  5) integra tiros e balas inimigas, reciclando o que sai do campo;
    //  6) graze (raspão carrega Foco) ANTES das colisões;
    //  7) colisões (tiros↔inimigos, balas↔nave) e temporizadores.
    if (this.mode === 'endless') {
      // Durante um encontro de chefe, suspende o spawn normal (luta focada).
      if (!this.bossDirector.boss) {
        this.endlessSpawner.update(this._tickCount, this.enemies, this.rng);
      }
    } else if (this.mode === 'campaign') {
      this.rng.nextUint32(); // reserva (campanha ainda não usa Rng)
      this.spawner.update(this._tickCount, this.enemies);
    }
    // bossrush: sem inimigos comuns (só chefes em sequência).

    this.player.step(this.fixedDeltaSec, input, this.bounds);
    this.autoFire.tick(this.playerShots, this.player.x, this.player.y);

    this.enemies.forEachActive((e) =>
      emitEnemyBullets(e, this.enemyBullets, this.player.x, this.player.y),
    );
    this.enemies.advance(this.fixedDeltaSec, this.bounds);

    // Chefe: campanha (entrada automática), Endless (encontros) ou Boss Rush.
    if (this.mode === 'campaign') {
      this.bossSystem.update(this._tickCount, this.enemyBullets, this.player.x, this.player.y);
    } else if (this.mode === 'endless') {
      this.bossDirector.update(
        this.level,
        this._tickCount,
        this.enemyBullets,
        this.player.x,
        this.player.y,
        this.rng,
        this.state,
      );
    } else {
      this.bossRush.update(
        this._tickCount,
        this.enemyBullets,
        this.player.x,
        this.player.y,
        this.state,
      );
    }

    this.playerShots.step(this.fixedDeltaSec, this.bounds);
    this.enemyBullets.step(this.fixedDeltaSec, this.bounds);

    // Pulso refletor (gasta Foco, limpa balas próximas) — antes de graze/colisão
    // para que possa salvar o jogador no mesmo tick.
    if (input.pulse) {
      const cleared = tryReflectPulse(this.player, this.enemyBullets, this.state, this.reflectCfg);
      if (cleared >= 0) {
        this.lastReflect = {
          tick: this._tickCount,
          x: this.player.x,
          y: this.player.y,
          radius: this.reflectCfg.pulseRadiusPx,
        };
      }
    }

    updateGraze(this.player, this.enemyBullets, this.state, this.grazeMargin);
    resolveShotsVsEnemies(this.playerShots, this.enemies, this.state);
    const boss = this.boss;
    if (boss) resolveShotsVsBoss(this.playerShots, boss);
    // Campanha: derrotar o chefe é VITÓRIA. Boss Rush: vitória ao vencer todos.
    // Endless: o BossDirector dá o bônus e a run continua (é infinito).
    if (this.mode === 'campaign' && this.bossSystem.boss.defeated && !this.state.won) {
      this.state.addScore(this.bossSystem.defeatScore);
      this.state.win();
    } else if (this.mode === 'bossrush' && this.bossRush.completed && !this.state.won) {
      this.state.win();
    }
    resolvePlayerVsBullets(this.player, this.enemyBullets, this.state);
    this.state.tickTimers();

    // Dobra o estado observável no checksum.
    this.foldHash(this.difficulty.level(this._tickCount));
    this.foldHash(Math.round(this.player.x) | 0);
    this.foldHash(Math.round(this.player.y) | 0);
    this.foldHash(this.playerShots.activeCount);
    this.foldHash(this.enemyBullets.activeCount);
    this.foldHash(this.enemies.activeCount);
    this.foldHash(this.state.score);
    this.foldHash(this.state.lives);
    this.foldHash(boss && boss.alive ? boss.hp : -1);
    this.foldHash(input.focus ? 1 : 0);

    this._tickCount++;
  }

  /** Avança N ticks com a mesma entrada — atalho para testes/headless. */
  tickN(n: number, input: SimInput = NEUTRAL_INPUT): void {
    for (let i = 0; i < n; i++) this.tick(input);
  }

  /**
   * Hash estável do estado atual (hex de 8 dígitos). É o "golden" comparável
   * entre máquinas no teste de determinismo (docs/03 §5.2).
   */
  hashState(): string {
    let h = this.checksum >>> 0;
    h = this.mix(h, this._tickCount);
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  /** Passo do FNV-1a de 32 bits sobre um inteiro de 32 bits. */
  private foldHash(value: number): void {
    this.checksum = this.mix(this.checksum, value);
  }

  private mix(hash: number, value: number): number {
    let h = hash >>> 0;
    let v = value >>> 0;
    for (let byte = 0; byte < 4; byte++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193); // primo FNV-1a de 32 bits
      v >>>= 8;
    }
    return h >>> 0;
  }
}
