import { describe, it, expect } from 'vitest';
import { musicTargets, type MusicSnapshot } from '../src/services/MusicDirector';
import { getAudioConfig } from '../src/content';

const cfg = getAudioConfig().music;
const snap = (over: Partial<MusicSnapshot>): MusicSnapshot => ({
  level: 0,
  bossActive: false,
  lives: 3,
  gameOver: false,
  ...over,
});

describe('MusicDirector — camadas por intensidade (P5-04-01)', () => {
  it('nível baixo, sem chefe, vida cheia ⇒ só base', () => {
    const t = musicTargets(snap({}), cfg);
    expect(t.base).toBe(cfg.layers.base);
    expect(t.rhythm).toBe(0);
    expect(t.tension).toBe(0);
    expect(t.danger).toBe(0);
  });

  it('nível ≥ rhythmLevel ⇒ entra a camada rítmica', () => {
    const t = musicTargets(snap({ level: cfg.rhythmLevel }), cfg);
    expect(t.rhythm).toBe(cfg.layers.rhythm);
  });

  it('chefe ativo ⇒ entra a camada de tensão', () => {
    const t = musicTargets(snap({ bossActive: true }), cfg);
    expect(t.tension).toBe(cfg.layers.tension);
  });

  it('vida ≤ dangerLives ⇒ entra a variação de perigo', () => {
    const t = musicTargets(snap({ lives: cfg.dangerLives }), cfg);
    expect(t.danger).toBe(cfg.layers.danger);
  });

  it('game over ⇒ tudo a zero', () => {
    const t = musicTargets(snap({ level: 9, bossActive: true, lives: 0, gameOver: true }), cfg);
    expect(t).toEqual({ base: 0, rhythm: 0, tension: 0, danger: 0 });
  });

  it('monotonicidade: subir nível nunca remove a rítmica', () => {
    let on = false;
    for (let lvl = 0; lvl < 10; lvl++) {
      const r = musicTargets(snap({ level: lvl }), cfg).rhythm;
      if (r > 0) on = true;
      if (on) expect(r).toBeGreaterThan(0);
    }
  });

  it('função pura: snapshot igual ⇒ resultado igual', () => {
    const s = snap({ level: 3, bossActive: true, lives: 1 });
    expect(musicTargets(s, cfg)).toEqual(musicTargets(s, cfg));
  });
});
