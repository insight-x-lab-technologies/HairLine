import { describe, it, expect } from 'vitest';
import {
  IDENTITY_RULES,
  shipRules,
  isIdentity,
  applyShipToPlayer,
  applyShipToAutoFire,
  applyShipToCombat,
  validateShips,
  type ShipDef,
} from '../src/sim/Ships';
import { getShips, getShip, getShipOrDefault, DEFAULT_SHIP_ID, SHIP_IDS } from '../src/content';
import playerData from '../src/data/player.json';
import combatData from '../src/data/combat.json';
import type { PlayerConfig } from '../src/sim/Player';
import type { AutoFireConfig } from '../src/sim/AutoFire';
import type { CombatConfig } from '../src/sim/GameState';

const basePlayer = playerData as PlayerConfig;
const baseAutoFire = (playerData as { autoFire: AutoFireConfig }).autoFire;
const baseCombat = combatData as CombatConfig;

describe('Ships — classes com regras de jogo (P6-04)', () => {
  it('campos de regra omitidos caem na identidade', () => {
    const def: ShipDef = { id: 'x', name: 'X', desc: '', rules: { fireIntervalMul: 0.5 } };
    const r = shipRules(def);
    expect(r.fireIntervalMul).toBe(0.5);
    expect(r.maxSpeedMul).toBe(1);
    expect(r.livesDelta).toBe(0);
  });

  it('as regras de identidade NÃO mudam nenhuma config (baseline pura)', () => {
    expect(isIdentity(IDENTITY_RULES)).toBe(true);
    expect(applyShipToPlayer(basePlayer, IDENTITY_RULES)).toEqual(basePlayer);
    expect(applyShipToAutoFire(baseAutoFire, IDENTITY_RULES)).toEqual(baseAutoFire);
    expect(applyShipToCombat(baseCombat, IDENTITY_RULES)).toEqual(baseCombat);
  });

  it('aplica multiplicadores ao player e arredonda a cadência (ticks inteiros)', () => {
    const r = shipRules({
      id: 'a',
      name: 'A',
      desc: '',
      rules: { maxSpeedMul: 0.5, hitboxRadiusMul: 2, fireIntervalMul: 0.7 },
    });
    const p = applyShipToPlayer(basePlayer, r);
    expect(p.maxSpeedPxPerSec).toBe(basePlayer.maxSpeedPxPerSec * 0.5);
    expect(p.hitboxRadiusPx).toBe(basePlayer.hitboxRadiusPx * 2);
    const af = applyShipToAutoFire(baseAutoFire, r);
    expect(af.intervalTicks).toBe(Math.round(baseAutoFire.intervalTicks * 0.7));
    expect(Number.isInteger(af.intervalTicks)).toBe(true);
  });

  it('cadência nunca baixa de 1 tick, mesmo com multiplicador minúsculo', () => {
    const r = shipRules({ id: 'a', name: 'A', desc: '', rules: { fireIntervalMul: 0.001 } });
    expect(applyShipToAutoFire(baseAutoFire, r).intervalTicks).toBe(1);
  });

  it('livesDelta soma às vidas e nunca deixa abaixo de 1; preserva campos extras', () => {
    const withReflect = { ...baseCombat, pulseCost: 100, pulseRadiusPx: 300 };
    const more = applyShipToCombat(
      withReflect,
      shipRules({ id: 'a', name: 'A', desc: '', rules: { livesDelta: 2 } }),
    );
    expect(more.lives).toBe(baseCombat.lives + 2);
    expect(more.pulseCost).toBe(100); // campo extra preservado
    const floored = applyShipToCombat(
      withReflect,
      shipRules({ id: 'a', name: 'A', desc: '', rules: { livesDelta: -99 } }),
    );
    expect(floored.lives).toBe(1);
  });

  it('validateShips: roster válido (1 default = identidade) passa; quebras lançam', () => {
    const ok: ShipDef[] = [
      { id: 'base', name: 'Base', desc: '', default: true, rules: {} },
      { id: 'fast', name: 'Fast', desc: '', rules: { fireIntervalMul: 0.7 } },
    ];
    expect(() => validateShips(ok)).not.toThrow();
    // Sem default.
    expect(() => validateShips([{ id: 'a', name: 'A', desc: '', rules: {} }])).toThrow();
    // Dois defaults.
    expect(() =>
      validateShips([
        { id: 'a', name: 'A', desc: '', default: true, rules: {} },
        { id: 'b', name: 'B', desc: '', default: true, rules: {} },
      ]),
    ).toThrow();
    // Default não-identidade.
    expect(() =>
      validateShips([{ id: 'a', name: 'A', desc: '', default: true, rules: { maxSpeedMul: 2 } }]),
    ).toThrow();
    // Multiplicador <= 0.
    expect(() =>
      validateShips([
        { id: 'a', name: 'A', desc: '', default: true, rules: {} },
        { id: 'b', name: 'B', desc: '', rules: { maxSpeedMul: 0 } },
      ]),
    ).toThrow();
    // livesDelta não inteiro.
    expect(() =>
      validateShips([
        { id: 'a', name: 'A', desc: '', default: true, rules: {} },
        { id: 'b', name: 'B', desc: '', rules: { livesDelta: 0.5 } },
      ]),
    ).toThrow();
    // Id duplicado.
    expect(() =>
      validateShips([
        { id: 'a', name: 'A', desc: '', default: true, rules: {} },
        { id: 'a', name: 'A2', desc: '', rules: {} },
      ]),
    ).toThrow();
  });
});

describe('Ships — roster registrado no content (P6-04)', () => {
  it('o roster inicial é válido e tem ≥2 classes', () => {
    expect(() => validateShips(getShips())).not.toThrow();
    expect(getShips().length).toBeGreaterThanOrEqual(2);
  });

  it('DEFAULT_SHIP_ID é a primeira classe e é identidade', () => {
    expect(SHIP_IDS[0]).toBe(DEFAULT_SHIP_ID);
    expect(isIdentity(shipRules(getShip(DEFAULT_SHIP_ID)))).toBe(true);
  });

  it('getShip lança em id desconhecido; getShipOrDefault resolve para a default', () => {
    expect(() => getShip('ninguem')).toThrow();
    expect(getShipOrDefault('ninguem').id).toBe(DEFAULT_SHIP_ID);
    expect(getShipOrDefault(undefined).id).toBe(DEFAULT_SHIP_ID);
  });
});
