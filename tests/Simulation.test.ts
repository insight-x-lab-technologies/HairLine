import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { FixedStepLoop } from '../src/sim/FixedStepLoop';

describe('Simulation — headless e determinística (docs/02 §3.1, docs/03 §5.2)', () => {
  it('roda sem render e avança um tick por vez', () => {
    const sim = new Simulation({ seed: 1 });
    expect(sim.tickCount).toBe(0);
    sim.tick();
    expect(sim.tickCount).toBe(1);
  });

  it('mesma seed + mesmo número de ticks = mesmo hash de estado', () => {
    const a = new Simulation({ seed: 12345 });
    const b = new Simulation({ seed: 12345 });
    for (let i = 0; i < 600; i++) {
      a.tick();
      b.tick();
    }
    expect(a.hashState()).toBe(b.hashState());
  });

  it('seeds diferentes produzem estados diferentes', () => {
    const a = new Simulation({ seed: 1 });
    const b = new Simulation({ seed: 2 });
    // Roda além do primeiro spawn (Endless) para que o Rng seja de fato
    // consumido — antes do 1º inimigo o estado é idêntico (nenhum sorteio).
    for (let i = 0; i < 250; i++) {
      a.tick();
      b.tick();
    }
    expect(a.hashState()).not.toBe(b.hashState());
  });

  it('o dt lógico é fixo e independe do FPS de render', () => {
    const sim = new Simulation({ seed: 1, tickRateHz: 60 });
    expect(sim.fixedDeltaMs).toBeCloseTo(1000 / 60, 6);
  });

  it('integra a nave: ticar com um alvo aproxima o player dele', () => {
    const sim = new Simulation({ seed: 1 });
    const start = { x: sim.player.x, y: sim.player.y };
    const target = { moveX: 100, moveY: 200, focus: false };
    for (let i = 0; i < 120; i++) sim.tick(target);
    // Após ~2 s de simulação, a nave deve ter chegado ao alvo.
    expect(sim.player.x).toBeCloseTo(100, 3);
    expect(sim.player.y).toBeCloseTo(200, 3);
    expect({ x: sim.player.x, y: sim.player.y }).not.toEqual(start);
  });

  it('tiro automático popula o pool de tiros do jogador ao longo dos ticks', () => {
    const sim = new Simulation({ seed: 1 });
    expect(sim.playerShots.activeCount).toBe(0);
    // 7 ticks com intervalo 6 (player.json) → 2 disparos, ainda na tela.
    for (let i = 0; i < 7; i++) sim.tick();
    expect(sim.playerShots.activeCount).toBe(2);
  });

  it('roda uma onda completa de forma determinística (estado e hash batem)', () => {
    // Migrado de mode:'campaign'/waveId para o modo 'stage' (P4-04b-01): o
    // estágio padrão (stage-001) inicia na 1ª seção de onda; em ~6 s o combate
    // ainda está na fase de ondas, exercitando o spawn por seção.
    const play = (): { hash: string; score: number; graze: number; enemyBullets: number } => {
      const sim = new Simulation({ seed: 0xc0ffee, mode: 'stage' });
      // Fica parado num canto, deixando o combate evoluir por ~6 s.
      const input = { moveX: 360, moveY: 1100, focus: false };
      for (let i = 0; i < 360; i++) sim.tick(input);
      return {
        hash: sim.hashState(),
        score: sim.state.score,
        graze: sim.state.grazeCount,
        enemyBullets: sim.enemyBullets.activeCount,
      };
    };
    const a = play();
    const b = play();
    expect(a).toEqual(b);
    // O combate de fato aconteceu: inimigos atiraram balas na tela.
    expect(a.enemyBullets).toBeGreaterThan(0);
  });

  it('começa a run com vidas cheias e sem game over', () => {
    const sim = new Simulation({ seed: 1 });
    expect(sim.state.lives).toBe(3);
    expect(sim.state.gameOver).toBe(false);
  });

  it('RunMods aplicam regras: livesOverride muda as vidas iniciais', () => {
    const normal = new Simulation({ seed: 1 });
    const glass = new Simulation({ seed: 1, mods: { livesOverride: 1 } });
    expect(glass.state.lives).toBe(1);
    expect(glass.state.lives).toBeLessThan(normal.state.lives);
  });

  it('RunMods são determinísticos e mudam o resultado (graze em dobro)', () => {
    const run = (mods?: { scorePerGrazeMul: number }): string => {
      const sim = new Simulation({ seed: 9, ...(mods ? { mods } : {}) });
      for (let i = 0; i < 300; i++) sim.tick({ moveX: 360, moveY: 1100, focus: false });
      return sim.hashState();
    };
    // mesmo com mods, é determinístico
    expect(run({ scorePerGrazeMul: 2 })).toBe(run({ scorePerGrazeMul: 2 }));
  });

  it('modo Boss Rush invoca chefe de imediato, sem inimigos comuns', () => {
    const sim = new Simulation({ seed: 5, mode: 'bossrush' });
    expect(sim.mode).toBe('bossrush');
    sim.tick({ moveX: 360, moveY: 1100, focus: false });
    expect(sim.boss).not.toBeNull();
    expect(sim.boss!.alive).toBe(true);
    expect(sim.enemies.activeCount).toBe(0); // não spawna inimigos comuns
  });

  it('Boss Rush: vencer todos os chefes encerra a run em vitória', () => {
    const sim = new Simulation({ seed: 5, mode: 'bossrush' });
    const input = { moveX: 360, moveY: 1100, focus: false };
    // Mata o chefe ativo a cada tick até a sequência acabar (limite de segurança).
    for (let i = 0; i < 5000 && !sim.state.gameOver; i++) {
      const b = sim.boss;
      if (b && b.alive) b.onHit(999);
      sim.tick(input);
    }
    expect(sim.state.won).toBe(true);
    expect(sim.state.score).toBeGreaterThan(0);
  });

  it('modo Endless (padrão) spawna inimigos proceduralmente e é determinístico', () => {
    const play = (): string => {
      const sim = new Simulation({ seed: 42 }); // mode endless por padrão
      const input = { moveX: 360, moveY: 1100, focus: false };
      for (let i = 0; i < 600; i++) sim.tick(input);
      return sim.hashState();
    };
    const sim = new Simulation({ seed: 42 });
    expect(sim.mode).toBe('endless');
    for (let i = 0; i < 600; i++) sim.tick({ moveX: 360, moveY: 1100, focus: false });
    expect(sim.enemies.activeCount).toBeGreaterThan(0); // spawnou sem onda autoral
    expect(play()).toBe(play()); // mesma seed → mesmo estado
  });

  it('modo stage começa na 1ª seção (onda) e expõe o progresso; é null fora dele', () => {
    // Migrado dos antigos testes de 'campaign' (P4-04b-01/02): o chefe entra
    // por limpeza de seção, não por enterTick; a sim expõe stageProgress.
    const sim = new Simulation({ seed: 1, mode: 'stage' });
    expect(sim.boss).toBeNull(); // ainda na fase de ondas
    expect(sim.stageProgress).toEqual({
      section: 1,
      total: 3,
      kind: 'wave',
      stageName: 'Primeiro Corte',
    });
    expect(new Simulation({ seed: 1 }).stageProgress).toBeNull(); // endless
  });

  it('concluir todas as seções do estágio encerra a run em vitória e pontua', () => {
    // livesOverride alto: o objetivo é provar a transição de seções até a
    // vitória, não a sobrevivência (a nave fica parada e levaria dano de chip
    // ao longo das ondas longas). É determinístico (mods entram no estado).
    const sim = new Simulation({ seed: 1, mode: 'stage', mods: { livesOverride: 99 } });
    const input = { moveX: 360, moveY: 1100, focus: false };
    // As ondas se esvaziam sozinhas (inimigos saem pela base); ao surgir o
    // chefe, aplica dano direto (atalho de teste) para derrotá-lo.
    for (let i = 0; i < 8000 && !sim.state.gameOver; i++) {
      const b = sim.boss;
      if (b && b.alive) b.onHit(999);
      sim.tick(input);
    }
    expect(sim.state.won).toBe(true);
    expect(sim.state.gameOver).toBe(true);
    expect(sim.state.score).toBeGreaterThanOrEqual(5000); // defeatScore do warden
  });

  it('o movimento da nave dentro da sim é determinístico para os mesmos inputs', () => {
    const a = new Simulation({ seed: 7 });
    const b = new Simulation({ seed: 7 });
    const seq = [
      { moveX: 300, moveY: 400, focus: false },
      { moveX: 80, moveY: 900, focus: true },
    ];
    for (let i = 0; i < 50; i++) {
      const inp = seq[i % seq.length]!;
      a.tick(inp);
      b.tick(inp);
    }
    expect(a.player.x).toBe(b.player.x);
    expect(a.player.y).toBe(b.player.y);
    expect(a.hashState()).toBe(b.hashState());
  });
});

describe('FixedStepLoop — acumulador (docs/02 §3.1)', () => {
  it('converte tempo de parede variável em ticks de tamanho fixo', () => {
    let ticks = 0;
    // Passo de 20 ms (50 Hz): divisor exato de 100, sem ambiguidade de float.
    const loop = new FixedStepLoop(20, () => ticks++);
    loop.advance(100); // 100 / 20 = exatamente 5 passos fixos.
    expect(ticks).toBe(5);
  });

  it('acumula resíduo entre chamadas em vez de descartá-lo (determinismo)', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(1000 / 60, () => ticks++);
    // Dois frames de 10 ms = 20 ms total → 1 tick, resíduo guardado.
    loop.advance(10);
    expect(ticks).toBe(0);
    loop.advance(10);
    expect(ticks).toBe(1);
  });

  it('limita o número de ticks por chamada para evitar espiral da morte', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(1000 / 60, () => ticks++, 5);
    // 10 s de atraso (aba em background) não deve gerar 600 ticks de uma vez.
    loop.advance(10000);
    expect(ticks).toBe(5);
  });

  it('alpha expõe a fração de interpolação para o render', () => {
    const loop = new FixedStepLoop(1000 / 60, () => {});
    loop.advance(1000 / 60 / 2); // metade de um passo
    expect(loop.alpha).toBeCloseTo(0.5, 2);
  });
});
