import { describe, it, expect } from 'vitest';
import {
  hitStopDurationFor,
  applyHitStop,
  tickHitStop,
  isFrozen,
  type HitStopConfig,
} from '../src/ui/HitStop';

const cfg: HitStopConfig = {
  enabled: true,
  maxMs: 200,
  durations: { playerHit: 90, bossPhase: 60, bossKill: 140, kill: 0, shotHit: 0, graze: 0 },
};

describe('HitStop — congelamento breve no driver do loop (P5-01-04)', () => {
  it('duração por tipo de evento vem do config; kill comum = 0', () => {
    expect(hitStopDurationFor('playerHit', cfg)).toBe(90);
    expect(hitStopDurationFor('bossKill', cfg)).toBe(140);
    expect(hitStopDurationFor('kill', cfg)).toBe(0);
    expect(hitStopDurationFor('graze', cfg)).toBe(0);
  });

  it('enabled:false ⇒ nada congela', () => {
    const off: HitStopConfig = { ...cfg, enabled: false };
    expect(hitStopDurationFor('playerHit', off)).toBe(0);
    expect(hitStopDurationFor('bossKill', off)).toBe(0);
  });

  it('política de sobreposição é max(restante, novo) com teto global', () => {
    // restante 40 + evento de 140 ⇒ 140 (max), abaixo do teto 200.
    expect(applyHitStop(40, 140, 200)).toBe(140);
    // novo menor que o restante não reduz.
    expect(applyHitStop(140, 60, 200)).toBe(140);
    // não soma: max(180,140)=180 (e o teto 200 nunca seria ultrapassado).
    expect(applyHitStop(180, 140, 200)).toBe(180);
    // teto global recorta um disparo grande.
    expect(applyHitStop(150, 300, 200)).toBe(200);
  });

  it('sem catch-up: desconta o delta sem nunca passar de 0', () => {
    let r = applyHitStop(0, 90, 200);
    expect(isFrozen(r)).toBe(true);
    // ~16,7 ms por frame; após ~6 frames (100 ms) descongela.
    for (let i = 0; i < 6; i++) r = tickHitStop(r, 16.7);
    expect(r).toBe(0);
    expect(isFrozen(r)).toBe(false);
  });

  it('a soma de tempo congelado equivale à duração disparada (sem rajada)', () => {
    // Simula o frame-loop: enquanto congelado a sim NÃO avança; soma do delta
    // pulado deve bater com a duração (90 ms), não viram ticks de uma vez.
    let r = applyHitStop(0, 90, 200);
    let frozenMs = 0;
    let advanceCalls = 0;
    for (let i = 0; i < 12; i++) {
      if (isFrozen(r)) {
        frozenMs += 16.7;
        r = tickHitStop(r, 16.7);
      } else {
        advanceCalls++; // aqui a cena chamaria loop.advance(delta) normalmente
      }
    }
    expect(frozenMs).toBeGreaterThanOrEqual(90);
    expect(frozenMs).toBeLessThan(90 + 16.7); // congelou só o necessário
    expect(advanceCalls).toBeGreaterThan(0); // depois o ritmo normal volta
  });
});
