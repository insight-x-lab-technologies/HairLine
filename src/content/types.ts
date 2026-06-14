/**
 * Tipos do conteúdo dirigido por dados (docs/02 §3.2).
 *
 * Padrões de bala usam o modelo de **emitters declarativos**: cada padrão é uma
 * lista de emitters parametrizados (ring/fan/aimed). Decisão estrutural da
 * Fase 1 — cobre leque/anel/mirado sem código por-padrão; uma DSL/timeline mais
 * rica pode vir na Fase 4 (editor), sem quebrar este formato.
 *
 * Convenção de ângulo: 0° aponta para BAIXO (+y, em direção ao jogador) e cresce
 * no sentido horário. vx = speed·sin(θ), vy = speed·cos(θ).
 */
export type EmitterType = 'ring' | 'fan' | 'aimed';

export interface Emitter {
  readonly type: EmitterType;
  /** Quantidade de balas por salva. */
  readonly count: number;
  /** Velocidade das balas, em px/s. */
  readonly speed: number;
  /** Raio de colisão das balas. */
  readonly bulletRadius: number;
  /** Idade do inimigo (em ticks) na primeira salva. */
  readonly startTick: number;
  /** Intervalo entre salvas, em ticks. <=0 ⇒ salva única. */
  readonly intervalTicks: number;
  /** Número de salvas. */
  readonly repeat: number;
  /** Direção base (graus). Para ring é o deslocamento inicial do anel. */
  readonly angleDeg?: number;
  /** Abertura total (graus) para 'fan' e 'aimed'. */
  readonly spreadDeg?: number;
  /** Rotação (graus) somada à base a CADA salva — gera espirais/anéis girando. */
  readonly angleStepDeg?: number;
  /** Aceleração ao longo da direção da bala (px/s²): acelera/desacelera. */
  readonly accel?: number;
  /** Incremento de velocidade por bala da salva (px/s) — camadas de velocidade. */
  readonly speedStep?: number;
  /** Incremento de raio por bala da salva (px). */
  readonly radiusStep?: number;
  /** Offset (graus) somado à direção base — útil para deslocar mira ('aimed'). */
  readonly aimOffsetDeg?: number;
}

export interface Pattern {
  readonly id: string;
  readonly emitters: readonly Emitter[];
}

export interface EnemyDef {
  readonly id: string;
  readonly hp: number;
  readonly radiusPx: number;
  /** Velocidade vertical de descida, em px/s. */
  readonly speedYPxPerSec: number;
  /** Id do padrão de bala que este inimigo dispara. */
  readonly patternId: string;
  /** Forma visual (apresentação): triangle | diamond | hex | circle. */
  readonly shape?: string;
  /** Cor neon em hex (apresentação), ex.: "#ff5d8f". */
  readonly color?: string;
}

export interface WaveEntry {
  /** Tick da simulação em que o inimigo entra. */
  readonly tick: number;
  readonly enemyId: string;
  readonly x: number;
  readonly y: number;
}

export interface Wave {
  readonly id: string;
  readonly entries: readonly WaveEntry[];
}

/**
 * Seção de um estágio curado (P4-04b-01): ou uma onda autoral (`wave`) ou um
 * encontro de chefe (`boss`). A ordem no array `StageDef.sections` é a ordem de
 * execução. Uma seção de onda termina quando a onda spawnou tudo e não há
 * inimigo vivo; uma de chefe, ao derrotá-lo.
 */
export type StageSection =
  | { readonly type: 'wave'; readonly waveId: string }
  | { readonly type: 'boss'; readonly bossId: string };

/**
 * Estágio curado (P4-04b-01): sequência autoral onda→onda→chefe declarada em
 * JSON. Substitui o antigo modo `campaign` (onda fixa + chefe por `enterTick`).
 */
export interface StageDef {
  readonly id: string;
  /** Nome legível (exibido no seletor e nos anúncios). */
  readonly name: string;
  /** Seções em ordem de execução. Mínimo 1. */
  readonly sections: readonly StageSection[];
}

/**
 * Escudo de fase (P4-02b-02): invulnerabilidade quebrável a tiros. Enquanto
 * ativo, os tiros reduzem o HP do escudo, não o do chefe. Com `rechargeTicks`,
 * volta cheio após o intervalo, dentro da mesma fase.
 */
export interface BossShieldDef {
  readonly hp: number;
  readonly rechargeTicks?: number;
}

/**
 * Lacaios de fase (P4-02b-03): a fase invoca `count` inimigos `enemyId` a cada
 * `intervalTicks` (idade da fase), respeitando `maxAlive` simultâneos.
 */
export interface BossAddsDef {
  readonly enemyId: string;
  readonly count: number;
  readonly intervalTicks: number;
  readonly maxAlive: number;
}

/**
 * Parte destrutível (P4-02b-04): sub-alvo com hitbox/HP próprios, preso ao corpo
 * do chefe por um offset. Enquanto houver parte viva na fase, o núcleo é
 * invulnerável. Pode emitir seu próprio padrão (idade = `phaseAge`).
 */
export interface BossPartDef {
  readonly offsetXPx: number;
  readonly offsetYPx: number;
  readonly radiusPx: number;
  readonly hp: number;
  readonly patternId?: string;
  /** Pontos por destruir esta parte (default: `BossDef.scorePerPartDefeat`). */
  readonly scorePerDefeat?: number;
}

/**
 * Movimento de fase (P4-02b-05): `sweep` (vaivém senoidal, default) ou
 * `teleport` (salto determinístico com telegraph). Ausente ⇒ `sweep`.
 */
export type BossMovementDef =
  | { readonly type: 'sweep' }
  | {
      readonly type: 'teleport';
      /** Ticks entre saltos (idade da fase). */
      readonly intervalTicks: number;
      /** Ticks de aviso (destino exposto) antes do reposicionamento. */
      readonly telegraphTicks: number;
      /** Margem mínima das bordas/topo ao sortear o destino (px). */
      readonly regionPadPx: number;
    };

/**
 * Definição de uma fase de chefe (P4-02b-01). A fase vale enquanto
 * `hp/maxHp > untilHpPct`; a última fase usa `untilHpPct === 0`. Os campos de
 * mecânica (escudo/adds/partes/movimento) são opcionais e compõem livremente.
 */
export interface BossPhaseDef {
  readonly patternId: string;
  /** Limiar inferior de HP% desta fase (estritamente decrescente; última = 0). */
  readonly untilHpPct: number;
  readonly shield?: BossShieldDef;
  readonly adds?: BossAddsDef;
  readonly parts?: readonly BossPartDef[];
  readonly movement?: BossMovementDef;
}

/**
 * Configuração de efeitos de apresentação (P5-01-01): juice de câmera, partículas,
 * hit-stop, anel de graze, HUD de Foco e haptics. Dados separados de código
 * (CLAUDE.md §3): tuning de "feel" iterado em JSON, nunca hardcoded na cena.
 * NUNCA é lido pela simulação (`src/sim/` não conhece este arquivo).
 */
export interface ShakeFx {
  readonly durationMs: number;
  readonly intensity: number;
}
export interface FlashFx {
  readonly durationMs: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}
/** Parâmetros de um burst de partículas por tipo de evento (P5-01-02/03). */
export interface ParticleFx {
  readonly count: number;
  readonly speed: number;
  readonly lifeTicks: number;
  readonly size: number;
  /** Fator de atrito por tick (1 = sem atrito; <1 desacelera). */
  readonly drag?: number;
  /** Aceleração vertical (px/tick²) decorativa. */
  readonly gravity?: number;
  /** Cor própria (hex). Ausente ⇒ herda a cor do evento. */
  readonly color?: string;
  /** Abertura do leque (radianos). Ausente ⇒ 2π (radial completo). */
  readonly spreadRad?: number;
  /** Micro-shake opcional disparado junto (ex.: kill de chefe). */
  readonly shake?: ShakeFx;
}
export interface EffectsConfig {
  readonly shake: Readonly<Record<string, ShakeFx>>;
  readonly flash: Readonly<Record<string, FlashFx>>;
  readonly reflectFx: { readonly durationTicks: number };
  readonly particles: Readonly<Record<string, ParticleFx>>;
  /** Teto de eventos consumidos por frame por tipo (anti-poluição visual). */
  readonly consumeCapsPerFrame: Readonly<Record<string, number>>;
  readonly hitStop: {
    readonly enabled: boolean;
    readonly maxMs: number;
    readonly durations: Readonly<Record<string, number>>;
  };
  readonly grazeRing: {
    readonly color: string;
    readonly coreColor: string;
    readonly lineWidth: number;
    readonly alphaNormal: number;
    readonly alphaFocus: number;
    readonly pingDurationTicks: number;
    readonly pingAlpha: number;
  };
  readonly focusHud: {
    readonly width: number;
    readonly height: number;
    readonly emptyColor: string;
    readonly fillColor: string;
    readonly readyColor: string;
    readonly markColor: string;
    readonly blipDurationTicks: number;
  };
  readonly haptics: {
    readonly throttleMs: number;
    readonly maxPatternMs: number;
    readonly patterns: Readonly<Record<string, readonly number[]>>;
  };
}

/**
 * Configuração de áudio dirigida por dados (P5-04). `music`: mapeamento
 * intensidade→camadas para a trilha dinâmica; `sfx`: polifonia/prioridade,
 * variação e ducking. Apresentação pura — fora da simulação.
 */
export interface AudioConfig {
  readonly music: {
    readonly rhythmLevel: number;
    readonly dangerLives: number;
    readonly layers: {
      readonly base: number;
      readonly rhythm: number;
      readonly tension: number;
      readonly danger: number;
    };
    readonly rampMs: { readonly in: number; readonly out: number };
  };
  readonly sfx: {
    readonly maxVoices: number;
    readonly voiceWindowMs: number;
    readonly perCueMax: Readonly<Record<string, number>>;
    readonly priority: Readonly<Record<string, number>>;
    readonly pitchVar: number;
    readonly gainVar: number;
    readonly duck: { readonly amount: number; readonly durationMs: number };
    readonly duckCues: readonly string[];
  };
}

export interface BossDef {
  readonly id: string;
  readonly hp: number;
  readonly radiusPx: number;
  /** Tick da simulação em que o chefe entra. */
  readonly enterTick: number;
  /** Altura em que o chefe se posiciona (y do mundo virtual). */
  readonly homeY: number;
  /** Amplitude do vaivém horizontal (px). */
  readonly sweepAmplitudePx: number;
  /** Período do vaivém (ticks). */
  readonly sweepPeriodTicks: number;
  /** Fases declarativas (índice = ordem). Mínimo 2; thresholds decrescentes. */
  readonly phases: readonly BossPhaseDef[];
  /** Pontos por derrotar o chefe. */
  readonly defeatScore: number;
  /** Pontos por destruir uma parte (default das partes sem `scorePerDefeat`). */
  readonly scorePerPartDefeat?: number;
  /** Forma visual do corpo (apresentação): circle | hex | diamond | triangle. */
  readonly shape?: string;
  /** Cor neon base (apresentação), ex.: "#ff5d8f". */
  readonly color?: string;
}
