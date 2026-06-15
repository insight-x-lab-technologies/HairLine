import type { AudioCue } from '../../systems/AudioCues';
import type { LayerGains } from '../MusicDirector';

/**
 * Recursos transversais que a fachada (`AudioService`) provê ao tema de áudio
 * a cada operação (P10-03): o contexto Web Audio, o bus master, o bus da trilha
 * e o buffer de ruído pré-gerado. Pertencem à fachada (ciclo de vida único); o
 * tema só os usa para sintetizar, nunca os cria nem os destrói.
 */
export interface AudioBackend {
  readonly ctx: AudioContext;
  /** Saída final (após mute/master gain). SFX conectam aqui. */
  readonly master: GainNode;
  /** Bus da trilha (alvo do ducking). As camadas da trilha conectam aqui. */
  readonly musicGain: GainNode;
  /** Ruído branco pré-gerado uma vez pela fachada (impactos/explosões). */
  readonly noiseBuffer: AudioBuffer | null;
}

/**
 * AudioTheme — backend de SÍNTESE/APRESENTAÇÃO de áudio selecionável por tema
 * (P10-03). Cobre apenas o que **varia** entre temas: como cada cue soa
 * (`playCue`) e como a trilha em camadas é construída/dirigida (`startMusic`,
 * `setLayerTargets`, `stopMusic`) + o **preset** de trilha (cosmético `music`).
 *
 * O que é **transversal** fica na fachada `AudioService` e NÃO se duplica por
 * tema: contexto Web Audio, master gain, **mute**, **ducking**, `SfxPolicy` e a
 * política de autoplay/gesto. A fachada já resolve mute/política antes de
 * chamar `playCue` (passa `pitchFactor`/`gainFactor` da `SfxPolicy`).
 *
 * Contrato pensado para a futura implementação por **samples** (P10-12) — tocar
 * buffers em vez de osciladores — sem reescrever a fachada. Ver TD-29.
 */
export interface AudioTheme {
  /**
   * Define o preset de trilha (cosmético `music` — P6-01-02). Preset
   * desconhecido cai em `default`. Cada tema declara os seus presets (o synth
   * tem os históricos; o de samples definirá os seus em P10-12).
   */
  setMusicPreset(preset: string): void;

  /**
   * Toca um cue de SFX. A fachada já garantiu contexto + não-mudo e consultou a
   * `SfxPolicy`; `pitchFactor`/`gainFactor` vêm dela (variação por disparo).
   */
  playCue(cue: AudioCue, backend: AudioBackend, pitchFactor: number, gainFactor: number): void;

  /** Constrói e inicia a trilha em camadas. Idempotente (no-op se já tocando). */
  startMusic(backend: AudioBackend): void;

  /**
   * Aplica os ganhos-alvo por camada com ramps suaves. No-op se a trilha não
   * estiver tocando. O `LayerGains` é o contrato com o `MusicDirector` (puro).
   */
  setLayerTargets(backend: AudioBackend, targets: LayerGains): void;

  /** Para a trilha e libera os osciladores/nodes que o tema criou. */
  stopMusic(): void;
}
