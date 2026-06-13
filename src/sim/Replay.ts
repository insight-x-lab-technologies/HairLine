import { Simulation } from './Simulation';
import { NEUTRAL_INPUT, type SimInput, type GameMode, type RunMods } from './types';

/**
 * Replay — gravação dos INPUTS + seed de uma run, e verificação por
 * re-simulação (docs/02 §7). Como a simulação é determinística, re-rodar os
 * mesmos inputs na mesma seed tem de produzir o mesmo hash/score. É a base do
 * anti-cheat: o servidor (ou o cliente) recomputa e confirma o placar, em vez
 * de confiar no número enviado.
 *
 * Formato v1: array de inputs por tick (compacto por bitpacking virá depois).
 */
export interface Replay {
  readonly seed: number;
  readonly mode: GameMode;
  readonly inputs: readonly SimInput[];
  readonly ticks: number;
  readonly finalHash: string;
  readonly score: number;
  /** Modificadores de regra aplicados (evento semanal), se houver. */
  readonly mods?: RunMods;
  /** Id do estágio (modo `stage`) — necessário para re-simular (P4-04b-01). */
  readonly stageId?: string;
}

export class ReplayRecorder {
  private readonly inputs: SimInput[] = [];

  constructor(
    private readonly seed: number,
    private readonly mode: GameMode,
    private readonly mods?: RunMods,
    private readonly stageId?: string,
  ) {}

  /** Registra o input de um tick (cópia normalizada). */
  record(input: SimInput): void {
    this.inputs.push({
      moveX: input.moveX,
      moveY: input.moveY,
      focus: input.focus,
      pulse: input.pulse ?? false,
    });
  }

  /** Fecha o replay com o estado final da simulação. */
  finalize(sim: Simulation): Replay {
    return {
      seed: this.seed,
      mode: this.mode,
      inputs: this.inputs.slice(),
      ticks: this.inputs.length,
      finalHash: sim.hashState(),
      score: sim.state.score,
      ...(this.mods ? { mods: this.mods } : {}),
      ...(this.stageId ? { stageId: this.stageId } : {}),
    };
  }
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly score: number;
  readonly hash: string;
}

/** Re-simula o replay e confirma se hash e score batem com os gravados. */
export function verifyReplay(replay: Replay): VerifyResult {
  const sim = new Simulation({
    seed: replay.seed,
    mode: replay.mode,
    ...(replay.mods ? { mods: replay.mods } : {}),
    ...(replay.stageId ? { stageId: replay.stageId } : {}),
  });
  for (const input of replay.inputs) {
    sim.tick(input ?? NEUTRAL_INPUT);
  }
  const hash = sim.hashState();
  const score = sim.state.score;
  return { ok: hash === replay.finalHash && score === replay.score, score, hash };
}
