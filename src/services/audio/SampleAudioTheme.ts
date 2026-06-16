import type { AudioCue } from '../../systems/AudioCues';
import type { LayerGains } from '../MusicDirector';
import { getAudioConfig } from '../../content';
import type { AudioBackend, AudioTheme } from './AudioTheme';
import { SynthAudioTheme } from './SynthAudioTheme';
import { getSampleBank, type SampleBank } from './sampleBank';
import { sfxKey, musicKey, trackMix, MUSIC_TRACKS, type MusicTrack } from './sampleManifest';

/**
 * SampleAudioTheme — backend de reprodução por **samples** (P10-12): SFX por
 * `AudioBufferSource` e trilha por faixas em loop com cross-fade. É o par sonoro
 * do tema "Polido", atrás do mesmo contrato `AudioTheme` (P10-03) — a fachada
 * `AudioService` segue dona do transversal (contexto, master, mute, ducking,
 * `SfxPolicy`, gesto) e não sabe que há buffers por trás.
 *
 * **Híbrido com fallback** (espelha `SpriteTheme`→vetorial): onde houver buffer
 * no `sampleBank`, toca por sample; onde faltar, DELEGA ao `SynthAudioTheme`
 * (síntese histórica) — por cue e para a trilha inteira. Assim o conteúdo
 * (SFX/faixas finais) entra incrementalmente sem mudar código e nada quebra sem
 * samples (critério de aceite #3). Ver TD-30.
 *
 * Disciplina Web Audio: um `AudioBufferSourceNode` NOVO por disparo (descartável;
 * nunca reusar um source já tocado — iOS/Safari). Sem `new` por disparo além
 * disso (padrão Web Audio).
 */
export class SampleAudioTheme implements AudioTheme {
  /** Backend de síntese para os cues/trilha sem sample (fallback por cue). */
  private readonly fallback = new SynthAudioTheme();
  /** Bank injetável (testes); ausente ⇒ lê o registro vivo a cada acesso. */
  private readonly injectedBank: SampleBank | undefined;
  private musicPreset = 'default';
  /** A trilha corrente está tocando por samples? (senão, está no fallback synth) */
  private usingSampleMusic = false;
  private trackGains: Partial<Record<MusicTrack, GainNode>> = {};
  private trackSources: AudioBufferSourceNode[] = [];
  private trackCurrent: Record<MusicTrack, number> = { calm: 0, intense: 0 };

  constructor(bank?: SampleBank) {
    this.injectedBank = bank;
  }

  private get bank(): SampleBank {
    return this.injectedBank ?? getSampleBank();
  }

  setMusicPreset(preset: string): void {
    this.musicPreset = preset;
    // Mantém o fallback sincronizado: se a trilha cair no synth, usa o preset.
    this.fallback.setMusicPreset(preset);
  }

  // ---- SFX ---------------------------------------------------------------

  /**
   * Toca um cue por sample (buffer→ganho→master) com pitch/ganho por disparo já
   * resolvidos pela fachada. Sem buffer para o cue ⇒ delega ao synth.
   */
  playCue(cue: AudioCue, backend: AudioBackend, pf: number, gf: number): void {
    const buf = this.bank.get(sfxKey(cue));
    if (!buf) {
      this.fallback.playCue(cue, backend, pf, gf);
      return;
    }
    const { ctx, master } = backend;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pf; // variação de pitch por disparo (`SfxPolicy`)
    const g = ctx.createGain();
    g.gain.value = gf; // variação de ganho por disparo
    src.connect(g).connect(master);
    src.start(t); // source descartável (GC após `onended`)
  }

  // ---- Trilha (cross-fade de faixas em loop) -----------------------------

  /**
   * Inicia a trilha. Se houver as duas faixas do preset no bank, toca-as em loop
   * (ganhos em 0; `setLayerTargets` faz o cross-fade). Faltando qualquer faixa,
   * DELEGA a trilha inteira ao synth. Idempotente em qualquer um dos caminhos.
   */
  startMusic(backend: AudioBackend): void {
    if (this.trackSources.length > 0) return; // já tocando por samples
    const calm = this.bank.get(musicKey(this.musicPreset, 'calm'));
    const intense = this.bank.get(musicKey(this.musicPreset, 'intense'));
    if (!calm || !intense) {
      this.usingSampleMusic = false;
      this.fallback.startMusic(backend); // synth é idempotente
      return;
    }
    this.usingSampleMusic = true;
    const { ctx, musicGain } = backend;
    const start = (buffer: AudioBuffer): GainNode => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(musicGain);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(g);
      src.start();
      this.trackSources.push(src);
      return g;
    };
    this.trackGains = { calm: start(calm), intense: start(intense) };
    this.trackCurrent = { calm: 0, intense: 0 };
  }

  /**
   * Aplica o cross-fade alvo (de `trackMix`) com ramps suaves — sobe rápido
   * (`rampMs.in`), desce devagar (`rampMs.out`), como o synth. No caminho de
   * fallback, repassa os alvos de camada ao synth.
   */
  setLayerTargets(backend: AudioBackend, targets: LayerGains): void {
    if (!this.usingSampleMusic) {
      this.fallback.setLayerTargets(backend, targets);
      return;
    }
    const { ctx } = backend;
    const cfg = getAudioConfig().music.rampMs;
    const now = ctx.currentTime;
    const mix = trackMix(targets);
    for (const tr of MUSIC_TRACKS) {
      const g = this.trackGains[tr];
      if (!g) continue;
      const target = mix[tr];
      const rising = target > this.trackCurrent[tr];
      const ms = rising ? cfg.in : cfg.out;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(target, now + ms / 1000);
      this.trackCurrent[tr] = target;
    }
  }

  /** Para a trilha (ambos os caminhos: libera os sources de sample e o synth). */
  stopMusic(): void {
    for (const s of this.trackSources) {
      try {
        s.stop();
      } catch {
        /* já parado */
      }
    }
    this.trackSources = [];
    this.trackGains = {};
    this.trackCurrent = { calm: 0, intense: 0 };
    this.usingSampleMusic = false;
    this.fallback.stopMusic(); // seguro mesmo se a trilha nunca caiu no synth
  }
}
