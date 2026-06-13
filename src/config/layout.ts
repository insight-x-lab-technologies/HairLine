/**
 * layout.ts — resolução virtual e responsividade (docs/02 §5).
 *
 * Princípio crítico de justiça (docs/02 §5.2): a ÁREA JOGÁVEL é sempre a mesma
 * resolução virtual em retrato, em qualquer dispositivo. O Scale Manager só
 * escala a APRESENTAÇÃO; a lógica roda sempre no mundo virtual, o que preserva
 * o determinismo e mantém o Desafio Diário justo entre telas diferentes.
 *
 * O que muda entre formatos é apenas a MOLDURA ao redor (letterbox/bezel),
 * nunca o tabuleiro.
 */

/** Mundo de jogo lógico, em retrato 9:16. Toda a lógica usa estas coordenadas. */
export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

/** Frequência lógica da simulação (Hz). Fixed timestep (docs/02 §3.1). */
export const TICK_RATE_HZ = 60;

/** Breakpoints de classificação de dispositivo pela razão de aspecto física. */
export const ASPECT = {
  /** Abaixo disto a tela é "mais larga que alta" → tratar como paisagem. */
  landscapeThreshold: 1.0,
  /** Acima disto (bem widescreen) → moldura tipo "arcade bezel". */
  widescreenThreshold: 1.6,
} as const;

export type DeviceForm = 'portrait' | 'landscape' | 'widescreen';

/** Classifica o formato a partir das dimensões físicas da viewport. */
export function classifyForm(widthPx: number, heightPx: number): DeviceForm {
  const ratio = widthPx / heightPx;
  if (ratio <= ASPECT.landscapeThreshold) return 'portrait';
  if (ratio >= ASPECT.widescreenThreshold) return 'widescreen';
  return 'landscape';
}
