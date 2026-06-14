/**
 * stats — modelo de exibição PURO da tela de estatísticas (P6-03-02), no
 * espírito de `ui/achievements`/`ui/hangar`: sem Phaser, testável. A cena
 * desenha; aqui só derivamos texto a partir do perfil (totais, recordes,
 * histórico). Formatação é derivada, nunca armazenada (durationTicks ⇒ mm:ss).
 */
import { TICK_RATE_HZ } from '../config/layout';
import type { RunSummary } from '../services/Achievements';

/** Modos exibidos com rótulo amigável; ordem = ordem de exibição dos recordes. */
const MODE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['endless', 'Endless'],
  ['stage', 'Estágios'],
  ['bossrush', 'Boss Rush'],
  ['daily', 'Diário'],
  ['weekly', 'Semanal'],
];

/** Duração em ticks ⇒ "m:ss" (60 Hz). Negativo/NaN ⇒ "0:00". */
export function formatDuration(ticks: number): string {
  const total = Number.isFinite(ticks) && ticks > 0 ? Math.floor(ticks / TICK_RATE_HZ) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** `dateIso` (UTC) ⇒ data local curta "dd/mm". Inválida/ausente ⇒ "—". */
export function formatDateShort(dateIso: string | undefined): string {
  if (!dateIso) return '—';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}`;
}

/** Uma linha de recorde por modo (só modos com algum recorde registrado). */
export interface BestRow {
  readonly mode: string;
  readonly label: string;
  readonly score: number;
}

/** Uma linha do histórico, já formatada para exibição. */
export interface HistoryRow {
  readonly date: string;
  readonly modeLabel: string;
  readonly score: number;
  readonly won: boolean;
  readonly duration: string;
}

export interface StatsModel {
  readonly empty: boolean;
  readonly totals: {
    readonly runs: number;
    readonly kills: number;
    readonly grazes: number;
    readonly wins: number;
    readonly playtime: string;
  };
  readonly bests: readonly BestRow[];
  readonly history: readonly HistoryRow[];
}

function labelFor(mode: string): string {
  return MODE_LABELS.find(([k]) => k === mode)?.[1] ?? mode;
}

/**
 * Monta o modelo da tela de estatísticas a partir do perfil. `empty` quando o
 * jogador ainda não terminou nenhuma run — a cena mostra o convite amigável.
 * Tempo total jogado = soma das durações do histórico disponível (informativo).
 */
export function statsModel(
  totals: Readonly<Record<string, number>>,
  bestByMode: Readonly<Record<string, number>>,
  history: readonly RunSummary[],
): StatsModel {
  const runs = totals.totalRuns ?? 0;
  const playticks = history.reduce((n, r) => n + (r.durationTicks ?? 0), 0);

  const bests = MODE_LABELS.map(([mode]): BestRow => {
    const score = bestByMode[mode] ?? 0;
    return { mode, label: labelFor(mode), score };
  }).filter((b) => b.score > 0);

  const rows = history.map(
    (r): HistoryRow => ({
      date: formatDateShort(r.dateIso),
      modeLabel: labelFor(r.daily ? 'daily' : r.mode),
      score: Math.floor(r.score),
      won: r.won,
      duration: formatDuration(r.durationTicks ?? 0),
    }),
  );

  return {
    empty: runs === 0 && history.length === 0,
    totals: {
      runs,
      kills: totals.totalKills ?? 0,
      grazes: totals.totalGraze ?? 0,
      wins: totals.totalWins ?? 0,
      playtime: formatDuration(playticks),
    },
    bests,
    history: rows,
  };
}
