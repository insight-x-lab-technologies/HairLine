/**
 * socialLinks — compartilhamento do JOGO (P6-06-03). Diferente de `ShareCard`
 * (que compartilha o resultado de uma run): aqui divulgamos o jogo em si
 * (URL + frase). O modelo de alvos é PURO e testável; o efeito colateral (abrir
 * aba / Web Share API / copiar) fica isolado em funções defensivas.
 *
 * WhatsApp/Telegram/X têm "share intent" web confiável (deep link). Instagram e
 * TikTok NÃO têm intent web de texto/URL — caem na Web Share API nativa (ótima
 * no celular) com fallback de copiar o link. Ver TD-26.
 */
export type ShareKind = 'intent' | 'native';

export interface ShareTarget {
  readonly id: string;
  readonly label: string;
  /** Glifo neon discreto (sem assets raster — estética vetorial). */
  readonly glyph: string;
  readonly kind: ShareKind;
  /** URL de intent — presente apenas quando `kind === 'intent'`. */
  readonly url?: string;
}

/** Resultado lógico de `shareGame` — útil para teste/telemetria. */
export type ShareOutcome = 'intent' | 'native' | 'copy' | 'open' | 'none';

/**
 * Alvos de compartilhamento para uma `gameUrl` + `text`. As URLs de intent já
 * vêm com texto/URL `encodeURIComponent`-ados.
 */
export function shareTargets(gameUrl: string, text: string): ShareTarget[] {
  const u = encodeURIComponent(gameUrl);
  const t = encodeURIComponent(text);
  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      glyph: 'WA',
      kind: 'intent',
      url: `https://wa.me/?text=${t}%20${u}`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      glyph: 'TG',
      kind: 'intent',
      url: `https://t.me/share/url?url=${u}&text=${t}`,
    },
    {
      id: 'x',
      label: 'X',
      glyph: 'X',
      kind: 'intent',
      url: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    },
    { id: 'instagram', label: 'Instagram', glyph: 'IG', kind: 'native' },
    { id: 'tiktok', label: 'TikTok', glyph: 'TT', kind: 'native' },
  ];
}

/** Abre uma URL externa com segurança. No-op se `window.open` indisponível. */
export function openExternal(url: string): void {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function canCopy(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

/**
 * Compartilha o jogo por um alvo:
 * - `intent`  ⇒ abre a URL de deep link da rede;
 * - `native`  ⇒ Web Share API (celular); sem ela, copia o link; sem ambos,
 *   abre a URL do jogo numa aba.
 * Retorna qual caminho foi usado (ou `'none'` se nada estava disponível).
 */
export function shareGame(target: ShareTarget, gameUrl: string, text: string): ShareOutcome {
  if (target.kind === 'intent' && target.url) {
    openExternal(target.url);
    return 'intent';
  }
  if (canNativeShare()) {
    void navigator.share({ title: 'HAIRLINE', text, url: gameUrl });
    return 'native';
  }
  if (canCopy()) {
    void navigator.clipboard.writeText(`${text} ${gameUrl}`);
    return 'copy';
  }
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    openExternal(gameUrl);
    return 'open';
  }
  return 'none';
}
