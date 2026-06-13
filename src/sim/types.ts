/**
 * Tipos do núcleo de simulação (headless, sem Phaser).
 *
 * Estes são os ÚNICOS dados que a lógica de jogo consome como entrada por
 * tick. A simulação nunca lê eventos brutos de dispositivo (docs/02 §5.4):
 * o InputService traduz toque/mouse/teclado para este formato abstrato, o que
 * torna a lógica testável e gravável como replay (docs/02 §7).
 */
export interface SimInput {
  /** Alvo de movimento desejado, em coordenadas do mundo virtual (retrato). */
  readonly moveX: number;
  readonly moveY: number;
  /** Modo Foco (precisão) ativo neste tick. */
  readonly focus: boolean;
  /** Pedido de pulso refletor neste tick (gatilho de borda, uma vez por toque). */
  readonly pulse?: boolean;
}

/** Entrada neutra: sem intenção de movimento, sem foco. */
export const NEUTRAL_INPUT: SimInput = { moveX: 0, moveY: 0, focus: false };

/** Modos de jogo. */
export type GameMode = 'endless' | 'stage' | 'bossrush';

/** Multiplicadores/overrides de regra (evento semanal). Plano e serializável. */
export interface RunMods {
  readonly scorePerGrazeMul?: number;
  readonly scorePerKillMul?: number;
  readonly focusPerGrazeMul?: number;
  readonly playerSpeedMul?: number;
  readonly spawnIntervalMul?: number;
  readonly livesOverride?: number;
}

export interface SimulationOptions {
  /** Seed determinística. Mesma seed + mesmos inputs = mesmo resultado. */
  readonly seed: number;
  /** Frequência lógica em Hz (passos por segundo). Padrão: 60. */
  readonly tickRateHz?: number;
  /** Dimensões do campo virtual. Padrão: resolução virtual de layout.ts. */
  readonly bounds?: { readonly w: number; readonly h: number };
  /** Id do estágio curado a executar (modo `stage`). Padrão: `stage-001`. */
  readonly stageId?: string;
  /** Modo de jogo. Padrão: 'endless' (procedural com dificuldade crescente). */
  readonly mode?: GameMode;
  /** Modificadores de regra (evento semanal). Fazem parte do estado determinístico. */
  readonly mods?: RunMods;
}
