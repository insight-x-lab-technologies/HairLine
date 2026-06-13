/**
 * ShareCard — gera o texto compartilhável de um resultado (o "fator Wordle",
 * docs/04 Fase 3). Puro e determinístico. Sem links/imagem por ora: texto com
 * emojis, fácil de colar em qualquer lugar.
 */
export interface ShareData {
  readonly mode: 'daily' | 'endless' | 'campaign' | 'bossrush';
  readonly dayKey?: string;
  readonly score: number;
  readonly graze: number;
  readonly level: number;
  readonly won?: boolean;
}

const MODE_LABEL: Record<ShareData['mode'], string> = {
  daily: 'Diário',
  endless: 'Endless',
  campaign: 'Campanha',
  bossrush: 'Boss Rush',
};

/** Barra de "intensidade" baseada no nível (visual rápido). */
function levelBar(level: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(level / 2)));
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

export function shareCard(d: ShareData): string {
  const head = `HAIRLINE · ${MODE_LABEL[d.mode]}${d.dayKey ? ` ${d.dayKey}` : ''}`;
  const status = d.won ? '🏆 Vitória!' : '';
  const line = `✦ ${d.score} pts · graze ${d.graze} · nível ${d.level}`;
  return [head, status, line, levelBar(d.level)].filter((s) => s.length > 0).join('\n');
}
