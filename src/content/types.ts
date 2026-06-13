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
