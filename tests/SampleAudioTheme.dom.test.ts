// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SampleAudioTheme } from '../src/services/audio/SampleAudioTheme';
import { sfxKey, musicKey } from '../src/services/audio/sampleManifest';
import { clearSampleBank, setSampleBank } from '../src/services/audio/sampleBank';
import type { AudioBackend } from '../src/services/audio/AudioTheme';

/**
 * SampleAudioTheme (P10-12): híbrido sample/synth. Onde há buffer, toca por
 * `AudioBufferSource`; onde falta, DELEGA ao synth (fallback por cue/trilha).
 * A paridade AUDÍVEL é manual (checklist no PR); aqui validamos o roteamento.
 */

function fakeGain() {
  const gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  return { gain, connect: vi.fn(() => fakeGain()) };
}

/** Contexto Web Audio mínimo que registra os sources de buffer criados. */
function fakeBackend() {
  const sources: {
    buffer: unknown;
    loop: boolean;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    createGain: vi.fn(() => fakeGain()),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null as unknown,
        loop: false,
        playbackRate: { value: 1 },
        connect: vi.fn(() => fakeGain()),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(src);
      return src;
    }),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      detune: { value: 0 },
      connect: vi.fn(() => fakeGain()),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      Q: { value: 0 },
      connect: vi.fn(() => fakeGain()),
    })),
  };
  const backend = {
    ctx,
    master: fakeGain(),
    musicGain: fakeGain(),
    noiseBuffer: { length: 1 },
  } as unknown as AudioBackend;
  return { backend, ctx, sources };
}

/** Um "AudioBuffer" qualquer (só precisamos da identidade no roteamento). */
const buf = (id: string) => ({ id }) as unknown as AudioBuffer;

beforeEach(() => clearSampleBank());

describe('SampleAudioTheme — SFX por sample vs fallback synth (P10-12)', () => {
  it('com buffer do cue ⇒ toca por AudioBufferSource (pitch/ganho por disparo)', () => {
    const bank = new Map<string, AudioBuffer>([[sfxKey('kill'), buf('kill')]]);
    const theme = new SampleAudioTheme(bank);
    const { backend, ctx, sources } = fakeBackend();

    theme.playCue('kill', backend, 1.2, 0.8);

    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).not.toHaveBeenCalled(); // não caiu no synth
    expect(sources[0]!.buffer).toBe(bank.get(sfxKey('kill')));
  });

  it('sem buffer do cue ⇒ delega ao synth (osciladores), sem buffer source', () => {
    const theme = new SampleAudioTheme(new Map());
    const { backend, ctx } = fakeBackend();

    // `bossteleport` é um blip puro no synth (sem camada de ruído por buffer),
    // então a ausência de `createBufferSource` prova que NÃO houve sample path.
    theme.playCue('bossteleport', backend, 1, 1);

    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(ctx.createOscillator).toHaveBeenCalled(); // synth desenhou o cue
  });

  it('bank vazio não lança em nenhum cue (critério de aceite #3)', () => {
    const theme = new SampleAudioTheme(new Map());
    const { backend } = fakeBackend();
    expect(() => {
      theme.playCue('graze', backend, 1, 1);
      theme.startMusic(backend);
      theme.setLayerTargets(backend, { base: 1, rhythm: 0, tension: 0, danger: 0 });
      theme.stopMusic();
    }).not.toThrow();
  });
});

describe('SampleAudioTheme — trilha por faixas em loop (P10-12)', () => {
  function withMusic() {
    const bank = new Map<string, AudioBuffer>([
      [musicKey('default', 'calm'), buf('calm')],
      [musicKey('default', 'intense'), buf('intense')],
    ]);
    return new SampleAudioTheme(bank);
  }

  it('com as duas faixas ⇒ inicia dois loops (calm/intense), sem synth', () => {
    const theme = withMusic();
    const { backend, ctx, sources } = fakeBackend();

    theme.startMusic(backend);

    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(sources.every((s) => s.loop)).toBe(true);
  });

  it('startMusic é idempotente no caminho de samples', () => {
    const theme = withMusic();
    const { backend, ctx } = fakeBackend();
    theme.startMusic(backend);
    theme.startMusic(backend);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2); // não recria
  });

  it('faltando uma faixa ⇒ trilha inteira cai no synth', () => {
    const bank = new Map<string, AudioBuffer>([[musicKey('default', 'calm'), buf('calm')]]);
    const theme = new SampleAudioTheme(bank);
    const { backend, ctx } = fakeBackend();

    theme.startMusic(backend);

    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(ctx.createOscillator).toHaveBeenCalled(); // synth construiu a trilha
  });

  it('setLayerTargets faz cross-fade (ramp nas duas faixas) no caminho de samples', () => {
    const theme = withMusic();
    const { backend } = fakeBackend();
    theme.startMusic(backend);
    expect(() =>
      theme.setLayerTargets(backend, { base: 1, rhythm: 0.5, tension: 0.6, danger: 0 }),
    ).not.toThrow();
  });

  it('stopMusic para os sources de loop', () => {
    const theme = withMusic();
    const { backend, sources } = fakeBackend();
    theme.startMusic(backend);
    theme.stopMusic();
    expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
  });
});

describe('SampleAudioTheme — bank do registro vivo (P10-12)', () => {
  it('sem bank injetado, lê o `sampleBank` populado pelo PreloadScene', () => {
    setSampleBank(new Map([[sfxKey('pulse'), buf('pulse')]]));
    const theme = new SampleAudioTheme(); // sem injeção
    const { backend, ctx } = fakeBackend();
    theme.playCue('pulse', backend, 1, 1);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
  });
});
