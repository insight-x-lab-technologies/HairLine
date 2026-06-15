/**
 * controls — configuração do esquema de CONTROLE de toque/mouse (P10-01).
 *
 * Presentation-only: define como a CENA traduz toque/mouse em alvo de
 * movimento. NUNCA é importado por `src/sim` — a sensibilidade e o esquema
 * (relativo/absoluto) não podem entrar na simulação, no replay ou no
 * `hashState()` (quebraria o Diário/anti-cheat). A sim segue recebendo só o
 * `moveX/moveY` absoluto já resolvido (ver TD do P10-01 / ARCHITECTURE).
 *
 * "Dados separados de código" (CLAUDE.md): o feel mora em `src/data/controls.json`.
 */
import raw from '../data/controls.json';

export type ControlScheme = 'relative' | 'absolute';

export interface ControlsConfig {
  /** Esquema default do TOQUE. O mouse (desktop) é sempre absoluto. */
  readonly scheme: ControlScheme;
  /** Multiplicador do delta de arraste no modo relativo. */
  readonly sensitivity: number;
  /** Fator aplicado à sensibilidade no modo Foco (precisão; <1 = mais lento). */
  readonly focusSensitivityFactor: number;
}

function asScheme(v: unknown): ControlScheme {
  return v === 'absolute' ? 'absolute' : 'relative';
}

function asPositive(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Lê e valida a config de controle (defaults seguros se o JSON divergir). */
export function getControlsConfig(): ControlsConfig {
  const o = raw as Record<string, unknown>;
  return {
    scheme: asScheme(o.scheme),
    sensitivity: asPositive(o.sensitivity, 1),
    focusSensitivityFactor: asPositive(o.focusSensitivityFactor, 0.5),
  };
}
