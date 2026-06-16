import { describe, it, expect } from 'vitest';
import { sfxKey, musicKey, trackMix, MUSIC_TRACKS } from '../src/services/audio/sampleManifest';
import { ALL_AUDIO_CUES } from '../src/systems/AudioCues';
import type { LayerGains } from '../src/services/MusicDirector';

/**
 * Mapeamento PURO do tema de áudio por samples (P10-12): convenção de chaves e
 * a função intensidade→faixa (cross-fade). Determinístico, sem Web Audio.
 */

describe('sampleManifest — convenção de chaves (P10-12)', () => {
  it('chave de SFX segue `aud-sfx-<cue>` para toda cue', () => {
    for (const cue of ALL_AUDIO_CUES) {
      expect(sfxKey(cue)).toBe(`aud-sfx-${cue}`);
    }
  });

  it('chave de música segue `aud-music-<preset>-<faixa>`', () => {
    expect(musicKey('default', 'calm')).toBe('aud-music-default-calm');
    expect(musicKey('pulse', 'intense')).toBe('aud-music-pulse-intense');
  });

  it('só há duas faixas de cross-fade (calm/intense)', () => {
    expect([...MUSIC_TRACKS]).toEqual(['calm', 'intense']);
  });
});

describe('sampleManifest — trackMix: intensidade → cross-fade (P10-12)', () => {
  const mk = (p: Partial<LayerGains>): LayerGains => ({
    base: 1,
    rhythm: 0,
    tension: 0,
    danger: 0,
    ...p,
  });

  it('base ausente (game over) ⇒ ambas as faixas em silêncio', () => {
    expect(trackMix(mk({ base: 0, rhythm: 0.5, tension: 0.6, danger: 0.45 }))).toEqual({
      calm: 0,
      intense: 0,
    });
  });

  it('só base ⇒ totalmente calma', () => {
    expect(trackMix(mk({}))).toEqual({ calm: 1, intense: 0 });
  });

  it('rítmica presente ⇒ meio-termo (cross-fade soma 1)', () => {
    const m = trackMix(mk({ rhythm: 0.5 }));
    expect(m).toEqual({ calm: 0.5, intense: 0.5 });
    expect(m.calm + m.intense).toBeCloseTo(1);
  });

  it('tensão (chefe) ou perigo (vida baixa) ⇒ totalmente intensa', () => {
    expect(trackMix(mk({ rhythm: 0.5, tension: 0.6 }))).toEqual({ calm: 0, intense: 1 });
    expect(trackMix(mk({ danger: 0.45 }))).toEqual({ calm: 0, intense: 1 });
  });

  it('é monotônica: mais camadas nunca reduz a faixa intensa', () => {
    const calmMix = trackMix(mk({}));
    const midMix = trackMix(mk({ rhythm: 0.5 }));
    const hotMix = trackMix(mk({ rhythm: 0.5, tension: 0.6 }));
    expect(midMix.intense).toBeGreaterThanOrEqual(calmMix.intense);
    expect(hotMix.intense).toBeGreaterThanOrEqual(midMix.intense);
  });
});
