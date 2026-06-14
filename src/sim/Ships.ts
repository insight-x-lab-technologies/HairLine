/**
 * Ships (P6-04) — classes de nave com REGRAS de jogo distintas.
 *
 * Diferente do cosmético (P6-01, só aparência/áudio), a classe de nave muda a
 * JOGABILIDADE: mobilidade, cadência de tiro, vidas, economia de graze. Por
 * isso é **entrada determinística** — entra em `SimulationOptions.shipId`, no
 * `Replay` e na linhagem do `hashState()` (ver `Simulation`/`Replay`).
 *
 * Filosofia de design: *diferentes, não mais fortes*. Cada nave é um
 * **sidegrade** com trade-off explícito (o balanceamento mora no JSON). A nave
 * `default` é **identidade pura** (regras neutras) ⇒ comportamento atual
 * byte-idêntico, preservando replays e o Diário já gravados.
 *
 * Tudo aqui é puro e headless: tipos + multiplicadores + aplicação às configs
 * base + validação. O catálogo (`src/data/ships.json`) é carregado e exposto
 * por `src/content/index.ts`.
 */
import type { PlayerConfig } from './Player';
import type { AutoFireConfig } from './AutoFire';
import type { CombatConfig } from './GameState';

/**
 * Multiplicadores/ajustes que uma classe aplica sobre as configs base. Todos
 * relativos (1 = sem efeito), exceto `livesDelta` (somado às vidas). Mantê-los
 * relativos garante que o balanceamento base (JSON) continue sendo a fonte da
 * verdade — a nave só inclina a curva.
 */
export interface ShipRules {
  readonly maxSpeedMul: number;
  readonly focusSpeedFactorMul: number;
  readonly hitboxRadiusMul: number;
  readonly fireIntervalMul: number;
  readonly shotSpeedMul: number;
  readonly focusPerGrazeMul: number;
  readonly grazeMarginMul: number;
  readonly invulnMul: number;
  readonly livesDelta: number;
}

/** Regras neutras: a nave default e o preenchimento de campos omitidos no JSON. */
export const IDENTITY_RULES: ShipRules = {
  maxSpeedMul: 1,
  focusSpeedFactorMul: 1,
  hitboxRadiusMul: 1,
  fireIntervalMul: 1,
  shotSpeedMul: 1,
  focusPerGrazeMul: 1,
  grazeMarginMul: 1,
  invulnMul: 1,
  livesDelta: 0,
};

/** Multiplicadores que precisam ser estritamente positivos (não-`livesDelta`). */
const POSITIVE_MULS = [
  'maxSpeedMul',
  'focusSpeedFactorMul',
  'hitboxRadiusMul',
  'fireIntervalMul',
  'shotSpeedMul',
  'focusPerGrazeMul',
  'grazeMarginMul',
  'invulnMul',
] as const;

/** Definição de uma classe de nave (data-driven). `rules` parcial ⇒ identidade. */
export interface ShipDef {
  readonly id: string;
  readonly name: string;
  /** Descrição do trade-off (exibida no seletor). */
  readonly desc: string;
  /** Exatamente uma nave do catálogo é a default (baseline). */
  readonly default?: boolean;
  readonly rules: Partial<ShipRules>;
}

/** Resolve as regras efetivas de uma nave (campos omitidos ⇒ identidade). */
export function shipRules(def: ShipDef): ShipRules {
  return { ...IDENTITY_RULES, ...def.rules };
}

/** A nave é a baseline pura (todas as regras neutras)? */
export function isIdentity(r: ShipRules): boolean {
  return (
    r.maxSpeedMul === 1 &&
    r.focusSpeedFactorMul === 1 &&
    r.hitboxRadiusMul === 1 &&
    r.fireIntervalMul === 1 &&
    r.shotSpeedMul === 1 &&
    r.focusPerGrazeMul === 1 &&
    r.grazeMarginMul === 1 &&
    r.invulnMul === 1 &&
    r.livesDelta === 0
  );
}

/** Aplica as regras à config da nave. Default (identidade) ⇒ valores idênticos. */
export function applyShipToPlayer(base: PlayerConfig, r: ShipRules): PlayerConfig {
  return {
    ...base,
    maxSpeedPxPerSec: base.maxSpeedPxPerSec * r.maxSpeedMul,
    focusSpeedFactor: base.focusSpeedFactor * r.focusSpeedFactorMul,
    hitboxRadiusPx: base.hitboxRadiusPx * r.hitboxRadiusMul,
  };
}

/**
 * Aplica as regras ao tiro automático. `intervalTicks` é cadência em TICKS
 * (inteiro): arredonda e nunca baixa de 1 (determinístico em qualquer FPS).
 */
export function applyShipToAutoFire(base: AutoFireConfig, r: ShipRules): AutoFireConfig {
  return {
    ...base,
    intervalTicks: Math.max(1, Math.round(base.intervalTicks * r.fireIntervalMul)),
    speedPxPerSec: base.speedPxPerSec * r.shotSpeedMul,
  };
}

/**
 * Aplica as regras ao combate (preserva campos extras, ex.: `ReflectConfig`).
 * `invulnTicks` arredonda (mín. 1); `lives` soma `livesDelta` (mín. 1).
 */
export function applyShipToCombat<T extends CombatConfig>(base: T, r: ShipRules): T {
  return {
    ...base,
    focusPerGraze: base.focusPerGraze * r.focusPerGrazeMul,
    grazeMarginPx: base.grazeMarginPx * r.grazeMarginMul,
    invulnTicks: Math.max(1, Math.round(base.invulnTicks * r.invulnMul)),
    lives: Math.max(1, base.lives + r.livesDelta),
  };
}

/**
 * Valida o roster (P6-04): ≥1 nave, ids únicos, exatamente 1 default, default =
 * identidade (baseline pura — protege o determinismo retroativo), multiplicadores
 * finitos e > 0, `livesDelta` inteiro. Lança em caso de erro (roda no load).
 */
export function validateShips(ships: readonly ShipDef[]): void {
  if (ships.length === 0) throw new Error('ships: catálogo vazio');
  const seen = new Set<string>();
  let defaults = 0;
  for (const s of ships) {
    if (!s.id) throw new Error('ship: id vazio');
    if (seen.has(s.id)) throw new Error(`ship: id duplicado "${s.id}"`);
    seen.add(s.id);
    if (s.default) defaults++;
    const r = shipRules(s);
    for (const k of POSITIVE_MULS) {
      if (typeof r[k] !== 'number' || !Number.isFinite(r[k]) || !(r[k] > 0)) {
        throw new Error(`ship "${s.id}": ${k} deve ser um número > 0`);
      }
    }
    if (!Number.isInteger(r.livesDelta)) {
      throw new Error(`ship "${s.id}": livesDelta deve ser inteiro`);
    }
  }
  if (defaults !== 1) {
    throw new Error(`ships: precisa de exatamente 1 default (tem ${defaults})`);
  }
  const def = ships.find((s) => s.default)!;
  if (!isIdentity(shipRules(def))) {
    throw new Error(`ships: a nave default "${def.id}" deve ter regras de identidade`);
  }
}
