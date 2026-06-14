/**
 * home — modelo de layout PURO da tela inicial (P6-06-01), no espírito de
 * `ui/hudLayout`/`ui/stats`: sem Phaser, testável. A `MenuScene` só desenha,
 * lendo as posições daqui. Substitui os offsets manuais `cy ± N` por um fluxo
 * responsivo que respeita as safe-areas e reserva uma faixa de rodapé na base
 * (preenchida pela P6-06-03/04).
 *
 * Estrutura vertical: HEADER ancorado no topo (título, tagline, recorde, nave),
 * BLOCO DE MENU centralizado no espaço restante (modos + atalhos de meta-jogo +
 * utilidades) e RODAPÉ reservado na base (compartilhar, doação, versão+©).
 */
import type { HudPadding } from './hudLayout';

export interface HomeFooter {
  /** Borda superior da faixa de rodapé (nada de conteúdo de menu abaixo disto). */
  readonly top: number;
  /** Linha dos ícones de compartilhamento social. */
  readonly social: number;
  /** Linha dos links de doação (Ko-fi / Buy Me a Coffee). */
  readonly donate: number;
  /** Linha de versão + copyright. */
  readonly legal: number;
}

export interface HomeLayout {
  readonly cx: number;
  readonly top: number;
  readonly bottom: number;
  // Header
  readonly title: number;
  readonly tagline: number;
  readonly record: number;
  readonly ship: number;
  // Menu (bloco central)
  readonly endless: number;
  readonly stages: number;
  readonly daily: number;
  readonly dayKey: number;
  readonly bossrush: number;
  readonly weekly: number;
  readonly weeklyLabel: number;
  readonly meta: number;
  readonly utilities: number;
  readonly footer: HomeFooter;
}

/** Altura reservada da faixa de rodapé, em unidades do mundo virtual. */
const FOOTER_HEIGHT = 110;

/**
 * Calcula as âncoras da home para um campo virtual `w`×`h` com o padding de
 * safe-area `pad` (em unidades virtuais, vindo de `hudPadding`). O bloco de menu
 * é centralizado no espaço entre o header e o rodapé; em telas curtas ele
 * **comprime** proporcionalmente em vez de se sobrepor.
 */
export function homeLayout(w: number, h: number, pad: HudPadding): HomeLayout {
  const cx = w / 2;
  const top = pad.top;
  const bottom = h - pad.bottom;
  const footerTop = bottom - FOOTER_HEIGHT;

  // HEADER — ancorado no topo. Cada valor é a posição (gap acumulado).
  let y = top;
  y += 36;
  const title = y;
  y += 44;
  const tagline = y;
  y += 36;
  const record = y;
  y += 48;
  const ship = y;
  const headerEnd = ship;

  // MENU — gaps "antes de cada item" (o primeiro abre o bloco).
  const gEndless = 0;
  const gStages = 60;
  const gDaily = 52;
  const gDayKey = 28;
  const gBossrush = 46;
  const gWeekly = 46;
  const gWeeklyLabel = 28;
  const gMeta = 56;
  const gUtilities = 50;
  const natural =
    gEndless + gStages + gDaily + gDayKey + gBossrush + gWeekly + gWeeklyLabel + gMeta + gUtilities;

  const availTop = headerEnd + 44;
  const availBottom = footerTop - 24;
  const avail = availBottom - availTop;
  // Comprime se o bloco natural não couber; senão centraliza no espaço livre.
  const scale = natural > 0 && avail < natural ? avail / natural : 1;
  let m = scale < 1 ? availTop : availTop + (avail - natural) / 2;

  m += gEndless * scale;
  const endless = m;
  m += gStages * scale;
  const stages = m;
  m += gDaily * scale;
  const daily = m;
  m += gDayKey * scale;
  const dayKey = m;
  m += gBossrush * scale;
  const bossrush = m;
  m += gWeekly * scale;
  const weekly = m;
  m += gWeeklyLabel * scale;
  const weeklyLabel = m;
  m += gMeta * scale;
  const meta = m;
  m += gUtilities * scale;
  const utilities = m;

  return {
    cx,
    top,
    bottom,
    title,
    tagline,
    record,
    ship,
    endless,
    stages,
    daily,
    dayKey,
    bossrush,
    weekly,
    weeklyLabel,
    meta,
    utilities,
    footer: {
      top: footerTop,
      social: footerTop + 28,
      donate: footerTop + 60,
      legal: footerTop + 90,
    },
  };
}
