import { shareCard, type ShareData } from './ShareCard';

/**
 * ShareImage — gera um cartão PNG do resultado e o compartilha (o "fator
 * Wordle" como IMAGEM, docs/04 Fase 3). Usa Web Share API (com arquivo) quando
 * disponível e cai para download caso contrário. Apresentação (canvas/DOM);
 * a parte pura (nome do arquivo) é testável.
 */

/** Nome de arquivo seguro e determinístico para o cartão. */
export function shareFilename(d: ShareData): string {
  const day = d.mode === 'daily' && d.dayKey ? `-${d.dayKey}` : '';
  return `hairline-${d.mode}${day}-${Math.floor(d.score)}.png`;
}

const W = 1080;
const H = 1080;

/** Desenha o cartão neon num canvas e o retorna. Requer DOM. */
export function buildShareCanvas(d: ShareData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Fundo.
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, W, H);
  // Moldura neon.
  ctx.strokeStyle = '#0bd3c6';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = 'center';
  const center = W / 2;

  ctx.fillStyle = '#39f5e8';
  ctx.font = 'bold 120px monospace';
  ctx.fillText('HAIRLINE', center, 240);

  ctx.fillStyle = '#5a6b7a';
  ctx.font = '40px monospace';
  const sub = d.mode === 'daily' ? `Desafio Diário · ${d.dayKey ?? ''}` : `Modo ${d.mode}`;
  ctx.fillText(sub, center, 320);

  if (d.won) {
    ctx.fillStyle = '#9af7ef';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('🏆 VITÓRIA', center, 430);
  }

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 180px monospace';
  ctx.fillText(String(d.score), center, 620);
  ctx.fillStyle = '#5a6b7a';
  ctx.font = '44px monospace';
  ctx.fillText('pontos', center, 680);

  ctx.fillStyle = '#0bd3c6';
  ctx.font = '56px monospace';
  ctx.fillText(`graze ${d.graze}   ·   nível ${d.level}`, center, 800);

  // Barra de intensidade (mesma do card de texto).
  ctx.fillStyle = '#9af7ef';
  ctx.font = '80px monospace';
  const filled = Math.max(0, Math.min(5, Math.round(d.level / 2)));
  ctx.fillText('▰'.repeat(filled) + '▱'.repeat(5 - filled), center, 920);

  ctx.fillStyle = '#5a6b7a';
  ctx.font = '36px monospace';
  ctx.fillText('jogue em hairline', center, 1020);

  return canvas;
}

/**
 * Compartilha o resultado como imagem. Web Share (arquivo) quando suportado;
 * senão, baixa o PNG. Retorna 'shared' | 'downloaded' | 'unsupported'.
 */
export async function shareResult(d: ShareData): Promise<'shared' | 'downloaded' | 'unsupported'> {
  if (typeof document === 'undefined') return 'unsupported';
  const canvas = buildShareCanvas(d);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) return 'unsupported';

  const filename = shareFilename(d);
  const text = shareCard(d);
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
  };

  const file = new File([blob], filename, { type: 'image/png' });
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text, title: 'HAIRLINE' });
      return 'shared';
    } catch {
      // usuário cancelou ou falhou → cai para download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
