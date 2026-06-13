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
  /** Id do padrão de bala por fase (índice = fase). 2 fases na Fase 1. */
  readonly phasePatternIds: readonly string[];
  /** Pontos por derrotar o chefe. */
  readonly defeatScore: number;
}
