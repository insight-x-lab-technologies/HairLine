// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../src/services/AudioService';
import type { AudioBackend, AudioTheme } from '../src/services/audio/AudioTheme';
import type { AudioCue } from '../src/systems/AudioCues';

/**
 * Contrato da FACHADA de áudio (P10-03): sem Web Audio ⇒ no-op silencioso e
 * mute persistido; com contexto, delega ao tema ativo e mantém mute/ducking
 * centralizados na fachada. A paridade AUDÍVEL é manual (checklist no PR).
 */

/** GainNode falso: registra as automações sem síntese real. */
function fakeGain(): GainNode {
  const gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  return { gain, connect: vi.fn(() => fakeGain()) } as unknown as GainNode;
}

/** AudioContext mínimo para `start()`/`play()` rodarem sem Web Audio real. */
function fakeAudioContext() {
  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    resume: vi.fn(),
    createGain: vi.fn(() => fakeGain()),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      detune: { value: 0 },
      connect: vi.fn(() => fakeGain()),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(48000) })),
  };
}

/** Tema espião: registra as delegações e nada sintetiza. */
function spyTheme() {
  return {
    setMusicPreset: vi.fn(),
    playCue: vi.fn(),
    startMusic: vi.fn(),
    setLayerTargets: vi.fn(),
    stopMusic: vi.fn(),
  } satisfies AudioTheme;
}

describe('AudioService — fachada sem Web Audio (P10-03)', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    delete (window as { AudioContext?: unknown }).AudioContext;
    delete (window as { webkitAudioContext?: unknown }).webkitAudioContext;
  });

  it('sem AudioContext ⇒ start/play/startMusic/setLayerTargets no-op sem lançar', () => {
    const theme = spyTheme();
    const svc = new AudioService(theme);
    expect(() => {
      svc.start();
      svc.play('hit');
      svc.startMusic();
      svc.setLayerTargets({ base: 0.1, rhythm: 0, tension: 0, danger: 0 });
      svc.stopMusic();
    }).not.toThrow();
    // Sem contexto, nada de SFX/trilha é delegado ao tema...
    expect(theme.playCue).not.toHaveBeenCalled();
    expect(theme.startMusic).not.toHaveBeenCalled();
    expect(theme.setLayerTargets).not.toHaveBeenCalled();
    // ...mas stopMusic é seguro mesmo sem contexto (libera nodes do tema).
    expect(theme.stopMusic).toHaveBeenCalledTimes(1);
  });

  it('mute persiste no localStorage e é relido por nova instância', () => {
    const svc = new AudioService(spyTheme());
    expect(svc.isMuted).toBe(false);
    expect(svc.toggleMute()).toBe(true);
    expect(globalThis.localStorage?.getItem('hairline.muted')).toBe('1');
    // Nova instância (nova "sessão") relê a preferência.
    expect(new AudioService(spyTheme()).isMuted).toBe(true);
  });
});

describe('AudioService — delegação ao tema ativo (P10-03)', () => {
  let ctx: ReturnType<typeof fakeAudioContext>;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    ctx = fakeAudioContext();
    (window as { AudioContext?: unknown }).AudioContext = function FakeAudioContext() {
      return ctx;
    } as unknown as typeof AudioContext;
  });

  afterEach(() => {
    delete (window as { AudioContext?: unknown }).AudioContext;
  });

  it('play delega playCue ao tema (mute/policy resolvidos na fachada)', () => {
    const theme = spyTheme();
    const svc = new AudioService(theme);
    svc.start();

    svc.play('graze');
    expect(theme.playCue).toHaveBeenCalledTimes(1);
    const [cue, backend] = theme.playCue.mock.calls[0] as [AudioCue, AudioBackend];
    expect(cue).toBe('graze');
    expect(backend.ctx).toBe(ctx); // recebe o backend transversal da fachada
  });

  it('mudo ⇒ a fachada NÃO delega playCue (mute é central)', () => {
    const theme = spyTheme();
    const svc = new AudioService(theme);
    svc.start();
    svc.setMuted(true);

    svc.play('hit');
    expect(theme.playCue).not.toHaveBeenCalled();
  });

  it('startMusic/setLayerTargets/setMusicPreset/stopMusic delegam ao tema', () => {
    const theme = spyTheme();
    const svc = new AudioService(theme);
    svc.start();

    svc.setMusicPreset('pulse');
    svc.startMusic();
    svc.setLayerTargets({ base: 0.12, rhythm: 0.1, tension: 0, danger: 0 });
    svc.stopMusic();

    expect(theme.setMusicPreset).toHaveBeenCalledWith('pulse');
    expect(theme.startMusic).toHaveBeenCalledTimes(1);
    expect(theme.setLayerTargets).toHaveBeenCalledTimes(1);
    expect(theme.stopMusic).toHaveBeenCalledTimes(1);
  });
});
