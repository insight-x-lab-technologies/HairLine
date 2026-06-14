import { describe, it, expect } from 'vitest';
import { ReplayRecorder, verifyReplay } from '../src/sim/Replay';
import { Simulation } from '../src/sim/Simulation';
import type { SimInput } from '../src/sim/types';

/** Roda uma sim gravando os inputs, e devolve o replay finalizado. */
function recordRun(seed: number, inputs: SimInput[]): ReturnType<ReplayRecorder['finalize']> {
  const sim = new Simulation({ seed, mode: 'endless' });
  const rec = new ReplayRecorder(seed, 'endless');
  for (const inp of inputs) {
    rec.record(inp);
    sim.tick(inp);
  }
  return rec.finalize(sim);
}

describe('Replay — gravação + verificação por re-simulação (docs/02 §7)', () => {
  const inputs: SimInput[] = Array.from({ length: 300 }, (_, i) => ({
    moveX: 360 + Math.round(80 * Math.sin(i / 20)),
    moveY: 1000,
    focus: i % 50 < 10,
  }));

  it('um replay gravado é verificado com sucesso (score e hash batem)', () => {
    const replay = recordRun(12345, inputs);
    const result = verifyReplay(replay);
    expect(result.ok).toBe(true);
    expect(result.score).toBe(replay.score);
    expect(result.hash).toBe(replay.finalHash);
  });

  it('replay guarda seed, modo, nº de ticks e inputs', () => {
    const replay = recordRun(7, inputs);
    expect(replay.seed).toBe(7);
    expect(replay.mode).toBe('endless');
    expect(replay.ticks).toBe(inputs.length);
    expect(replay.inputs).toHaveLength(inputs.length);
  });

  it('score adulterado falha na verificação (anti-cheat)', () => {
    const replay = recordRun(999, inputs);
    const tampered = { ...replay, score: replay.score + 100000 };
    expect(verifyReplay(tampered).ok).toBe(false);
  });

  it('inputs adulterados quebram o hash final', () => {
    const replay = recordRun(2024, inputs);
    const tampered = {
      ...replay,
      inputs: replay.inputs.map((inp, i) => (i === 0 ? { ...inp, moveX: 0 } : inp)),
    };
    expect(verifyReplay(tampered).ok).toBe(false);
  });

  it('re-simulação é estável: verificar duas vezes dá o mesmo resultado', () => {
    const replay = recordRun(55, inputs);
    expect(verifyReplay(replay)).toEqual(verifyReplay(replay));
  });

  it('replay de estágio grava o stageId e re-simula com hash/score corretos (P4-04b-01)', () => {
    const sim = new Simulation({ seed: 808, mode: 'stage', stageId: 'stage-002' });
    const rec = new ReplayRecorder(808, 'stage', undefined, 'stage-002');
    for (const inp of inputs) {
      rec.record(inp);
      sim.tick(inp);
    }
    const replay = rec.finalize(sim);
    expect(replay.stageId).toBe('stage-002');
    expect(verifyReplay(replay).ok).toBe(true);
    // Sem o stageId (ou com outro), a re-simulação parte do stage-001 e NÃO bate.
    const { stageId: _omit, ...noStage } = replay;
    expect(verifyReplay(noStage).ok).toBe(false);
  });

  it('replay com mods (evento semanal) verifica corretamente', () => {
    const mods = { scorePerGrazeMul: 2, livesOverride: 1 };
    const sim = new Simulation({ seed: 321, mode: 'endless', mods });
    const rec = new ReplayRecorder(321, 'endless', mods);
    for (const inp of inputs) {
      rec.record(inp);
      sim.tick(inp);
    }
    const replay = rec.finalize(sim);
    expect(replay.mods).toEqual(mods);
    expect(verifyReplay(replay).ok).toBe(true);
    // sem os mods, a re-simulação NÃO bate (mods fazem parte do estado).
    const { mods: _omit, ...noMods } = replay;
    expect(verifyReplay(noMods).ok).toBe(false);
  });

  it('replay com classe de nave grava o shipId e re-simula corretamente (P6-04)', () => {
    const sim = new Simulation({ seed: 4242, mode: 'endless', shipId: 'glaive' });
    const rec = new ReplayRecorder(4242, 'endless', undefined, undefined, 'glaive');
    for (const inp of inputs) {
      rec.record(inp);
      sim.tick(inp);
    }
    const replay = rec.finalize(sim);
    expect(replay.shipId).toBe('glaive');
    expect(verifyReplay(replay).ok).toBe(true);
    // Sem o shipId, a re-simulação parte da nave default e NÃO bate (anti-cheat).
    const { shipId: _omit, ...noShip } = replay;
    expect(verifyReplay(noShip).ok).toBe(false);
    // Adulterar para outra classe também reprova.
    expect(verifyReplay({ ...replay, shipId: 'bulwark' }).ok).toBe(false);
  });
});
