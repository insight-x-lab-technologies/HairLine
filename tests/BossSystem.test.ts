import { describe, it, expect } from 'vitest';
import { BossSystem } from '../src/systems/BossSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { getBoss } from '../src/content';

const CENTER_X = 360;

function makeSystem(): BossSystem {
  return new BossSystem(getBoss('warden'), CENTER_X);
}

describe('BossSystem — chefe com 2 fases (Fase 1)', () => {
  it('não está ativo antes do enterTick e entra na hora certa', () => {
    const sys = makeSystem();
    const bullets = new BulletPool(2048);
    sys.update(100, bullets, 360, 1000);
    expect(sys.boss.alive).toBe(false);
    sys.update(getBoss('warden').enterTick, bullets, 360, 1000);
    expect(sys.boss.alive).toBe(true);
    expect(sys.boss.hp).toBe(getBoss('warden').hp);
    expect(sys.boss.phaseIndex).toBe(0);
  });

  it('posiciona o chefe no topo e oscila em torno do centro dentro da amplitude', () => {
    const def = getBoss('warden');
    const sys = makeSystem();
    const bullets = new BulletPool(2048);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let t = def.enterTick; t < def.enterTick + def.sweepPeriodTicks; t++) {
      sys.update(t, bullets, 360, 1000);
      minX = Math.min(minX, sys.boss.x);
      maxX = Math.max(maxX, sys.boss.x);
      expect(sys.boss.y).toBe(def.homeY);
    }
    expect(minX).toBeGreaterThanOrEqual(CENTER_X - def.sweepAmplitudePx - 1);
    expect(maxX).toBeLessThanOrEqual(CENTER_X + def.sweepAmplitudePx + 1);
    expect(maxX - minX).toBeGreaterThan(def.sweepAmplitudePx); // de fato varreu
  });

  it('emite balas ao longo do tempo (usa o padrão da fase)', () => {
    const def = getBoss('warden');
    const sys = makeSystem();
    const bullets = new BulletPool(2048);
    for (let t = def.enterTick; t < def.enterTick + 120; t++) {
      sys.update(t, bullets, 360, 1000);
    }
    expect(bullets.activeCount).toBeGreaterThan(0);
  });

  it('passa para a fase 2 ao cair abaixo de metade da vida (reinicia o padrão)', () => {
    const def = getBoss('warden');
    const sys = makeSystem();
    const bullets = new BulletPool(2048);
    sys.update(def.enterTick, bullets, 360, 1000);
    sys.update(def.enterTick + 1, bullets, 360, 1000);
    expect(sys.boss.phaseIndex).toBe(0);
    // dano até logo abaixo da metade
    const damage = Math.floor(def.hp / 2) + 1;
    let defeated = false;
    for (let i = 0; i < damage; i++) defeated = sys.boss.onHit(1);
    expect(defeated).toBe(false);
    expect(sys.boss.phaseIndex).toBe(1);
    expect(sys.boss.phaseAge).toBe(0); // padrão da nova fase começa do zero
  });

  it('é derrotado quando a vida chega a zero', () => {
    const def = getBoss('warden');
    const sys = makeSystem();
    const bullets = new BulletPool(2048);
    sys.update(def.enterTick, bullets, 360, 1000);
    let defeated = false;
    for (let i = 0; i < def.hp; i++) defeated = sys.boss.onHit(1);
    expect(defeated).toBe(true);
    expect(sys.boss.alive).toBe(false);
    expect(sys.boss.defeated).toBe(true);
  });

  it('é determinístico para a mesma sequência', () => {
    const def = getBoss('warden');
    const run = (): number => {
      const sys = makeSystem();
      const bullets = new BulletPool(2048);
      for (let t = def.enterTick; t < def.enterTick + 200; t++) {
        sys.update(t, bullets, 200, 1000);
      }
      return bullets.activeCount + Math.round(sys.boss.x);
    };
    expect(run()).toBe(run());
  });
});
