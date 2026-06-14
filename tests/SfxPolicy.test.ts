import { describe, it, expect } from 'vitest';
import { SfxPolicy } from '../src/services/SfxPolicy';
import { getAudioConfig } from '../src/content';

const cfg = getAudioConfig().sfx;

describe('SfxPolicy — polifonia, prioridade e variação (P5-04-02)', () => {
  it('respeita o teto por cue (perCueMax)', () => {
    const p = new SfxPolicy(cfg);
    const max = cfg.perCueMax.kill!;
    let admitted = 0;
    for (let i = 0; i < 10; i++) if (p.request('kill', 0)) admitted++;
    expect(admitted).toBe(max);
  });

  it('hit (prioridade alta) desloca uma voz de menor prioridade quando lotado', () => {
    // Config restrita: 1 voz global, sem teto por cue, para isolar a prioridade.
    const tight = { ...cfg, maxVoices: 1, perCueMax: {} as Record<string, number> };
    const p = new SfxPolicy(tight);
    expect(p.request('kill', 0)).toBe(true); // ocupa a única vaga
    expect(p.request('kill', 0)).toBe(false); // mesma prioridade, sem vaga
    expect(p.request('hit', 0)).toBe(true); // prioridade maior despeja o kill
  });

  it('voz expira após a janela e libera vaga', () => {
    const tight = { ...cfg, maxVoices: 1, perCueMax: {} as Record<string, number> };
    const p = new SfxPolicy(tight);
    expect(p.request('kill', 0)).toBe(true);
    expect(p.request('kill', 0)).toBe(false);
    // Passada a janela, a voz some e a vaga volta.
    expect(p.request('kill', cfg.voiceWindowMs + 1)).toBe(true);
  });

  it('variação determinística: mesma seed ⇒ mesma sequência, dentro do limite', () => {
    const seq = (seed: number): number[] => {
      const p = new SfxPolicy(cfg, seed);
      return [p.pitchFactor(), p.pitchFactor(), p.gainFactor()];
    };
    expect(seq(42)).toEqual(seq(42));
    const p = new SfxPolicy(cfg, 7);
    for (let i = 0; i < 50; i++) {
      const pf = p.pitchFactor();
      expect(pf).toBeGreaterThanOrEqual(1 - cfg.pitchVar);
      expect(pf).toBeLessThanOrEqual(1 + cfg.pitchVar);
    }
  });

  it('ducking: só eventos grandes abaixam a trilha', () => {
    const p = new SfxPolicy(cfg);
    expect(p.shouldDuck('hit')).toBe(true);
    expect(p.shouldDuck('gameover')).toBe(true);
    expect(p.shouldDuck('graze')).toBe(false);
    expect(p.shouldDuck('kill')).toBe(false);
  });
});
