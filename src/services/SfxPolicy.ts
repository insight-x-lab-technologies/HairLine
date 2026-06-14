import { Rng } from './Rng';
import type { AudioConfig } from '../content/types';
import type { AudioCue } from '../systems/AudioCues';

/**
 * SfxPolicy — política PURA de polifonia/prioridade e variação dos SFX
 * (P5-04-02). Decide o que toca e o que é descartado quando muitos sons
 * coincidem, e produz a variação determinística de pitch/ganho. Sem Web Audio:
 * o `AudioService` executa as decisões. A aleatoriedade decorativa usa um `Rng`
 * local semeado (mesmo padrão do `ParticlePool`) — fora da sim, não entra no
 * replay, mas respeita o lint (proibido `Math.random`).
 */
interface Voice {
  cue: AudioCue;
  expiresAt: number;
  priority: number;
}

export class SfxPolicy {
  private readonly voices: Voice[] = [];
  private readonly rng: Rng;

  constructor(
    private readonly cfg: AudioConfig['sfx'],
    seed = 0x1234abcd,
  ) {
    this.rng = new Rng(seed >>> 0);
  }

  private priorityOf(cue: AudioCue): number {
    return this.cfg.priority[cue] ?? 1;
  }

  /**
   * Pede permissão para tocar `cue` em `nowMs`. Retorna se deve tocar (e admite
   * a voz, possivelmente despejando uma de menor prioridade). Regras:
   *  - poda vozes expiradas (janela `voiceWindowMs`);
   *  - respeita `perCueMax` por cue;
   *  - se há espaço global (`maxVoices`), admite;
   *  - senão, despeja a voz viva de MENOR prioridade se for menor que a desta
   *    cue; caso contrário, descarta.
   */
  request(cue: AudioCue, nowMs: number): boolean {
    this.prune(nowMs);

    const perMax = this.cfg.perCueMax[cue];
    if (perMax !== undefined) {
      let sameCue = 0;
      for (const v of this.voices) if (v.cue === cue) sameCue++;
      if (sameCue >= perMax) return false;
    }

    const prio = this.priorityOf(cue);
    if (this.voices.length >= this.cfg.maxVoices) {
      // Procura a voz viva de menor prioridade para despejar.
      let worstIdx = -1;
      let worstPrio = Infinity;
      for (let i = 0; i < this.voices.length; i++) {
        if (this.voices[i]!.priority < worstPrio) {
          worstPrio = this.voices[i]!.priority;
          worstIdx = i;
        }
      }
      if (worstIdx < 0 || worstPrio >= prio) return false; // nada com prioridade menor
      this.voices.splice(worstIdx, 1);
    }

    this.voices.push({ cue, expiresAt: nowMs + this.cfg.voiceWindowMs, priority: prio });
    return true;
  }

  /** Fator multiplicativo de pitch (1±pitchVar), determinístico. */
  pitchFactor(): number {
    return 1 + this.rng.range(-this.cfg.pitchVar, this.cfg.pitchVar);
  }

  /** Fator multiplicativo de ganho (1±gainVar), determinístico. */
  gainFactor(): number {
    return 1 + this.rng.range(-this.cfg.gainVar, this.cfg.gainVar);
  }

  /** A cue deve abaixar (duck) a trilha? (eventos grandes) */
  shouldDuck(cue: AudioCue): boolean {
    return this.cfg.duckCues.includes(cue);
  }

  private prune(nowMs: number): void {
    for (let i = this.voices.length - 1; i >= 0; i--) {
      if (this.voices[i]!.expiresAt <= nowMs) this.voices.splice(i, 1);
    }
  }
}
