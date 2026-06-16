import { describe, it, expect } from 'vitest';
import { getEffects, getAudioConfig, validateEffects, validateAudioConfig } from '../src/content';
import { ALL_AUDIO_CUES } from '../src/systems/AudioCues';
import type { EffectsConfig, AudioConfig } from '../src/content/types';

describe('effects.json — integridade dos dados de juice (P5-01-01)', () => {
  it('carrega e valida sem erro', () => {
    expect(() => validateEffects(getEffects())).not.toThrow();
  });

  it('toda cue de shake/flash existe no tipo AudioCue', () => {
    const cfg = getEffects();
    const valid = new Set<string>(ALL_AUDIO_CUES);
    for (const cue of Object.keys(cfg.shake)) expect(valid.has(cue)).toBe(true);
    for (const cue of Object.keys(cfg.flash)) expect(valid.has(cue)).toBe(true);
  });

  it('migra 1:1 os valores atuais de shake/flash (sem mudar o feel)', () => {
    const cfg = getEffects();
    expect(cfg.shake.hit).toEqual({ durationMs: 200, intensity: 0.014 });
    expect(cfg.shake.gameover).toEqual({ durationMs: 450, intensity: 0.02 });
    expect(cfg.flash.hit).toEqual({ durationMs: 160, r: 255, g: 60, b: 80 });
    expect(cfg.flash.pulse).toEqual({ durationMs: 120, r: 90, g: 210, b: 255 });
    expect(cfg.reflectFx.durationTicks).toBe(18);
  });

  it('rejeita cue desconhecida e número negativo', () => {
    const base = getEffects();
    const bad = (over: Partial<EffectsConfig>): EffectsConfig => ({ ...base, ...over });
    expect(() =>
      validateEffects(bad({ shake: { naoexiste: { durationMs: 1, intensity: 1 } } })),
    ).toThrow();
    expect(() => validateEffects(bad({ reflectFx: { durationTicks: -1 } }))).toThrow();
  });

  it('seção de partículas exige lifeTicks > 0', () => {
    const base = getEffects();
    const bad: EffectsConfig = {
      ...base,
      particles: { ...base.particles, kill: { ...base.particles.kill!, lifeTicks: 0 } },
    };
    expect(() => validateEffects(bad)).toThrow();
  });

  it('background: rejeita alpha fora de faixa, sem camadas e raio invertido (P10-07)', () => {
    const base = getEffects();
    const withBg = (over: Partial<EffectsConfig['background']>): EffectsConfig => ({
      ...base,
      background: { ...base.background, ...over },
    });
    expect(() => validateEffects(withBg({ starLayers: [] }))).toThrow();
    expect(() =>
      validateEffects(
        withBg({ starLayers: [{ count: 1, speed: 1, size: 1, color: '#fff', alpha: 1.5 }] }),
      ),
    ).toThrow();
    expect(() =>
      validateEffects(withBg({ nebula: { ...base.background.nebula, radiusMax: 1, radiusMin: 9 } })),
    ).toThrow();
    expect(() =>
      validateEffects(withBg({ nebula: { ...base.background.nebula, count: 2, colors: [] } })),
    ).toThrow();
  });

  it('haptics: padrões não vazios, positivos e dentro do teto', () => {
    const base = getEffects();
    const withPatterns = (patterns: Record<string, number[]>): EffectsConfig => ({
      ...base,
      haptics: { ...base.haptics, patterns },
    });
    expect(() => validateEffects(withPatterns({ hit: [] }))).toThrow();
    expect(() => validateEffects(withPatterns({ hit: [-1] }))).toThrow();
    expect(() => validateEffects(withPatterns({ hit: [9999] }))).toThrow(); // > maxPatternMs
  });
});

describe('audio.json — integridade dos dados de áudio (P5-04)', () => {
  it('carrega e valida sem erro', () => {
    expect(() => validateAudioConfig(getAudioConfig())).not.toThrow();
  });

  it('rejeita ganho de camada > 1 e teto de polifonia < 1', () => {
    const base = getAudioConfig();
    const badLayers: AudioConfig = {
      ...base,
      music: { ...base.music, layers: { ...base.music.layers, rhythm: 1.5 } },
    };
    expect(() => validateAudioConfig(badLayers)).toThrow();
    const badVoices: AudioConfig = { ...base, sfx: { ...base.sfx, maxVoices: 0 } };
    expect(() => validateAudioConfig(badVoices)).toThrow();
  });

  it('synth: knobs de síntese presentes e em faixa válida (P10-08)', () => {
    const sy = getAudioConfig().synth;
    // Frequências de síntese são positivas (Hz); spread do pad é não-negativo.
    for (const k of [
      'impactNoiseHz',
      'killSubHz',
      'hitSubHz',
      'pulseShimmerHz',
      'rhythmCutoffHz',
    ] as const) {
      expect(sy[k]).toBeGreaterThan(0);
    }
    expect(sy.padDetuneCents).toBeGreaterThanOrEqual(0);
  });

  it('synth: rejeita Hz não-positivo e detune negativo (P10-08)', () => {
    const base = getAudioConfig();
    const withSynth = (over: Partial<AudioConfig['synth']>): AudioConfig => ({
      ...base,
      synth: { ...base.synth, ...over },
    });
    expect(() => validateAudioConfig(withSynth({ killSubHz: 0 }))).toThrow();
    expect(() => validateAudioConfig(withSynth({ impactNoiseHz: -1 }))).toThrow();
    expect(() => validateAudioConfig(withSynth({ padDetuneCents: -1 }))).toThrow();
  });
});
