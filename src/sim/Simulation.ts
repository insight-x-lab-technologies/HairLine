import { Rng } from '../services/Rng';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { Player, type Bounds, type PlayerConfig } from './Player';
import { AutoFire, type AutoFireConfig } from './AutoFire';
import { BulletPool } from '../entities/BulletPool';
import { EnemyPool } from '../entities/EnemyPool';
import { emitEnemyBullets } from '../systems/PatternSystem';
import {
  resolveShotsVsEnemies,
  resolvePlayerVsBullets,
  resolveShotsVsBossSystem,
} from '../systems/CollisionSystem';
import { updateGraze } from '../systems/GrazeSystem';
import { tryReflectPulse, type ReflectConfig } from '../systems/ReflectPulse';
import { type BossSystem, type Boss } from '../systems/BossSystem';
import { BossDirector } from '../systems/BossDirector';
import { BossRushDirector } from '../systems/BossRushDirector';
import { StageDirector, type StageProgress } from '../systems/StageDirector';
import { DifficultySystem, type DifficultyConfig } from '../systems/DifficultySystem';
import { EndlessSpawnSystem } from '../systems/EndlessSpawnSystem';
import { GameState, type CombatConfig } from './GameState';
import { getStage } from '../content';
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
/** Estágio padrão do modo `stage` (o seletor escolhe outros — P4-04b-04). */
const DEFAULT_STAGE_ID = 'stage-001';

/**
 * Simulation — o "mundo" lógico do jogo, tickável e headless (docs/02 §3.1,
 * docs/03 §5.2).
 *
 * Orquestra todo o jogo em passos fixos: spawn (Endless procedural via Rng ou
 * estágio curado por seções de onda), nave + tiro, inimigos e seus padrões de
 * bala, chefe (estágio/Endless/rush), graze, pulso refletor, colisões e
 * pontuação. Consome
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
  /** Diretor de estágio curado (modo `stage`): seções onda→onda→chefe. */
  readonly stageDirector: StageDirector;
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
    this.stageDirector = new StageDirector(
      getStage(opts.stageId ?? DEFAULT_STAGE_ID),
      this.bounds.w / 2,
      opts.seed,
    );

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
    return this.stageDirector.boss;
  }

  /** BossSystem ativo (mecânicas de P4-02b: escudo/partes/teleporte) ou null. */
  get activeBossSystem(): BossSystem | null {
    if (this.mode === 'endless') return this.bossDirector.currentSystem;
    if (this.mode === 'bossrush') return this.bossRush.currentSystem;
    return this.stageDirector.currentSystem;
  }

  /**
   * Progresso do estágio (P4-04b-02): seção atual/total/tipo/nome, ou `null`
   * fora do modo `stage`. Somente-leitura: nada do render/HUD entra na sim.
   */
  get stageProgress(): StageProgress | null {
    return this.mode === 'stage' ? this.stageDirector.progress : null;
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
    //  1) spawn de inimigos (Endless: procedural | stage: onda da seção | bossrush: nenhum);
    //  2) nave em passo fixo + tiro automático;
    //  3) inimigos emitem balas (função da idade) e então se movem/envelhecem;
    //  4) chefe (stage / Endless / Boss Rush);
    //  5) integra tiros e balas inimigas, reciclando o que sai do campo;
    //  6) graze (raspão carrega Foco) ANTES das colisões;
    //  7) colisões (tiros↔inimigos, balas↔nave) e temporizadores.
    if (this.mode === 'endless') {
      // Durante um encontro de chefe, suspende o spawn normal (luta focada).
      if (!this.bossDirector.boss) {
        this.endlessSpawner.update(this._tickCount, this.enemies, this.rng);
      }
    } else if (this.mode === 'stage') {
      // Spawna a onda da seção atual (no-op em seção de chefe).
      this.stageDirector.spawnPhase(this._tickCount, this.enemies);
    }
    // bossrush: sem inimigos comuns (só chefes em sequência).

    this.player.step(this.fixedDeltaSec, input, this.bounds);
    this.autoFire.tick(this.playerShots, this.player.x, this.player.y);

    this.enemies.forEachActive((e) =>
      emitEnemyBullets(e, this.enemyBullets, this.player.x, this.player.y),
    );
    this.enemies.advance(this.fixedDeltaSec, this.bounds);

    // Chefe: estágio (seção de chefe), Endless (encontros) ou Boss Rush.
    if (this.mode === 'stage') {
      this.stageDirector.bossPhase(
        this._tickCount,
        this.enemyBullets,
        this.player.x,
        this.player.y,
        this.enemies,
      );
    } else if (this.mode === 'endless') {
      this.bossDirector.update(
        this.level,
        this._tickCount,
        this.enemyBullets,
        this.player.x,
        this.player.y,
        this.rng,
        this.state,
        this.enemies,
      );
    } else {
      this.bossRush.update(
        this._tickCount,
        this.enemyBullets,
        this.player.x,
        this.player.y,
        this.state,
        this.enemies,
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
    const bossSys = this.activeBossSystem;
    if (bossSys && bossSys.boss.alive) {
      resolveShotsVsBossSystem(this.playerShots, bossSys, this.state);
    }
    // Estágio: concluir a última seção é VITÓRIA (o StageDirector soma o
    // defeatScore de cada chefe na transição). Boss Rush: vitória ao vencer
    // todos. Endless: o BossDirector dá o bônus e a run continua (é infinito).
    if (this.mode === 'stage') {
      this.stageDirector.endPhase(this.enemies, this.state);
      if (this.stageDirector.completed && !this.state.won) this.state.win();
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
    const hashBoss = this.boss;
    this.foldHash(hashBoss && hashBoss.alive ? hashBoss.hp : -1);
    this.foldHash(input.focus ? 1 : 0);
    // Seção atual do estágio (P4-04b-01): transição de seção entra no hash para
    // que replay/anti-cheat cubram o avanço onda→onda→chefe.
    if (this.mode === 'stage') this.foldHash(this.stageDirector.sectionIndex);
    // Estado das mecânicas do chefe (P4-02b) no checksum: escudo, partes e
    // ciclo de teleporte — sem isso o anti-cheat/replay não cobriria a luta.
    if (bossSys && bossSys.boss.alive) {
      this.foldHash(bossSys.shieldActive ? bossSys.shieldHp : -1);
      let partsAlive = 0;
      let partsHpSum = 0;
      for (const p of bossSys.parts) {
        if (p.alive) partsAlive++;
        partsHpSum += p.hp;
      }
      this.foldHash(partsAlive);
      this.foldHash(partsHpSum);
      this.foldHash(bossSys.telegraphActive ? 1 : 0);
      this.foldHash(Math.round(bossSys.boss.x) | 0);
      this.foldHash(Math.round(bossSys.boss.y) | 0);
    }

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
