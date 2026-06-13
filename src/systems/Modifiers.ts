import { Rng } from '../services/Rng';
import type { RunMods } from '../sim/types';

/**
 * Modifiers — mutadores de regra para eventos semanais (docs/04 Fase 4).
 *
 * Um evento semanal aplica um conjunto de modificadores escolhidos de forma
 * determinística pela SEMANA (mesmos para todos), alterando regras da run via
 * multiplicadores/override num objeto plano `RunMods` (ver sim/types). A
 * Simulation aplica esses mods ao construir os configs. Puro e determinístico.
 */
export type { RunMods };

export interface ModifierDef {
  readonly id: string;
  readonly label: string;
  readonly mods: RunMods;
}

/** Biblioteca de modificadores (dados de regra; cresce livremente). */
export const MODIFIERS: readonly ModifierDef[] = [
  {
    id: 'double-graze',
    label: 'Graze em Dobro',
    mods: { scorePerGrazeMul: 2, focusPerGrazeMul: 1.5 },
  },
  { id: 'glass-cannon', label: 'Canhão de Vidro', mods: { livesOverride: 1, scorePerKillMul: 3 } },
  { id: 'swarm', label: 'Enxame', mods: { spawnIntervalMul: 0.6, scorePerKillMul: 1.3 } },
  { id: 'zen-flow', label: 'Fluxo Zen', mods: { focusPerGrazeMul: 2 } },
  { id: 'nimble', label: 'Ágil', mods: { playerSpeedMul: 1.2 } },
  { id: 'marathon', label: 'Maratona', mods: { spawnIntervalMul: 1.35, scorePerKillMul: 1.6 } },
];

// ---- Semana (ISO) ---------------------------------------------------------

/** Chave da semana ISO: 'AAAA-Www' (mesma para todos na semana). */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // quinta-feira da semana
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / 86400000 / 7 - 0.5 + 0.0);
  const yyyy = d.getUTCFullYear();
  return `${yyyy}-W${String(week).padStart(2, '0')}`;
}

/** Seed (uint32) derivada da semana via FNV-1a. */
export function weeklySeed(date: Date): number {
  const key = weekKey(date);
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Escolhe `count` modificadores distintos da semana (determinístico). */
export function pickWeeklyModifiers(date: Date, count = 2): ModifierDef[] {
  const rng = new Rng(weeklySeed(date) ^ 0x4d4f44);
  const pool = [...MODIFIERS];
  // Fisher-Yates determinístico.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.intRange(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Combina vários modificadores num único RunMods (multiplica muls). */
export function combineMods(defs: readonly ModifierDef[]): RunMods {
  let scorePerGrazeMul = 1;
  let scorePerKillMul = 1;
  let focusPerGrazeMul = 1;
  let playerSpeedMul = 1;
  let spawnIntervalMul = 1;
  let livesOverride: number | undefined;

  for (const d of defs) {
    const m = d.mods;
    scorePerGrazeMul *= m.scorePerGrazeMul ?? 1;
    scorePerKillMul *= m.scorePerKillMul ?? 1;
    focusPerGrazeMul *= m.focusPerGrazeMul ?? 1;
    playerSpeedMul *= m.playerSpeedMul ?? 1;
    spawnIntervalMul *= m.spawnIntervalMul ?? 1;
    if (m.livesOverride != null) {
      livesOverride =
        livesOverride == null ? m.livesOverride : Math.min(livesOverride, m.livesOverride);
    }
  }

  return {
    scorePerGrazeMul,
    scorePerKillMul,
    focusPerGrazeMul,
    playerSpeedMul,
    spawnIntervalMul,
    ...(livesOverride != null ? { livesOverride } : {}),
  };
}
