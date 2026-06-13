import { describe, it, expect } from 'vitest';
import { diffCues, type AudioSnapshot } from '../src/systems/AudioCues';

const base: AudioSnapshot = {
  score: 0,
  lives: 3,
  kills: 0,
  grazeCount: 0,
  reflectTick: -1,
  gameOver: false,
  won: false,
};

describe('AudioCues — quais sons tocar a partir de deltas (Fase 2)', () => {
  it('sem mudança, nenhum cue', () => {
    expect(diffCues(base, { ...base })).toEqual([]);
  });

  it('perder vida → hit', () => {
    expect(diffCues(base, { ...base, lives: 2 })).toContain('hit');
  });

  it('abater inimigo → kill', () => {
    expect(diffCues(base, { ...base, kills: 1 })).toContain('kill');
  });

  it('graze a mais → graze', () => {
    expect(diffCues(base, { ...base, grazeCount: 5 })).toContain('graze');
  });

  it('novo pulso (reflectTick mudou) → pulse', () => {
    expect(diffCues(base, { ...base, reflectTick: 120 })).toContain('pulse');
  });

  it('game over por morte → gameover; por vitória → victory', () => {
    expect(diffCues(base, { ...base, gameOver: true, won: false })).toContain('gameover');
    expect(diffCues(base, { ...base, gameOver: true, won: true })).toContain('victory');
  });

  it('não repete gameover se já estava em game over', () => {
    const over = { ...base, gameOver: true };
    expect(diffCues(over, { ...over })).not.toContain('gameover');
  });

  it('vários eventos no mesmo tick geram múltiplos cues, em ordem estável', () => {
    const cur = { ...base, lives: 2, kills: 1, grazeCount: 1 };
    expect(diffCues(base, cur)).toEqual(['hit', 'kill', 'graze']);
  });
});
