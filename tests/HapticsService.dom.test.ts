// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HapticsService, type HapticsStore } from '../src/services/HapticsService';

/** Store em memória injetável (padrão do mute / SaveService). */
function memStore(initial = true): HapticsStore {
  let v = initial;
  return {
    getHapticsEnabled: () => v,
    setHapticsEnabled: (x) => {
      v = x;
    },
  };
}

describe('HapticsService — vibração por evento, com toggle (P5-04-03)', () => {
  let calls: (number | number[])[];
  let nav: { vibrate: (p: number | number[]) => boolean };

  beforeEach(() => {
    calls = [];
    nav = {
      vibrate: (p) => {
        calls.push(p);
        return true;
      },
    };
  });

  it('cue hit ⇒ vibra com o padrão do JSON; cue sem padrão ⇒ nada', () => {
    const h = new HapticsService(memStore(true), nav, () => 0);
    h.vibrate('hit');
    expect(calls).toEqual([60]); // [60] de 1 elemento vira número (effects.json)
    h.vibrate('graze'); // sem padrão
    h.vibrate('kill'); // sem padrão
    expect(calls.length).toBe(1);
  });

  it('toggle off ⇒ não vibra; religar ⇒ volta a vibrar; preferência persiste', () => {
    const store = memStore(true);
    const h = new HapticsService(store, nav, () => 0);
    h.setEnabled(false);
    h.vibrate('hit');
    expect(calls.length).toBe(0);
    expect(store.getHapticsEnabled()).toBe(false);
    // Novo serviço com o MESMO store lê a preferência persistida.
    const h2 = new HapticsService(store, nav, () => 0);
    expect(h2.isEnabled).toBe(false);
    h2.toggle();
    h2.vibrate('hit');
    expect(calls.length).toBe(1);
  });

  it('ambiente sem navigator.vibrate ⇒ isSupported=false e nenhuma exceção', () => {
    const h = new HapticsService(memStore(true), {}, () => 0);
    expect(h.isSupported).toBe(false);
    expect(() => h.vibrate('hit')).not.toThrow();
    expect(calls.length).toBe(0);
  });

  it('throttle: duas cues em < throttleMs ⇒ uma vibração só', () => {
    let t = 0;
    const h = new HapticsService(memStore(true), nav, () => t);
    h.vibrate('hit');
    t = 40; // < 80ms (throttleMs do JSON)
    h.vibrate('pulse');
    expect(calls.length).toBe(1);
    t = 200; // passou a janela
    h.vibrate('pulse');
    expect(calls.length).toBe(2);
  });

  it('padrão de 1 elemento vira número; vários viram array', () => {
    const h = new HapticsService(memStore(true), nav, () => 0);
    h.vibrate('pulse'); // [20] → 20
    expect(calls[0]).toBe(20);
    const h2 = new HapticsService(memStore(true), nav, () => 0);
    h2.vibrate('gameover'); // [80,60,120] → array
    expect(Array.isArray(h2 && calls[1])).toBe(true);
  });

  it('relógio real opcional não quebra (usa Date.now por padrão)', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const h = new HapticsService(memStore(true), nav);
    h.vibrate('hit');
    expect(calls.length).toBe(1);
    spy.mockRestore();
  });
});
