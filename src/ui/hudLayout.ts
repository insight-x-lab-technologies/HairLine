/**
 * hudLayout — onde posicionar o HUD para não cair sob notches/barras de gesto
 * (docs/02 §5.3). Lógica PURA e testável: converte os insets de área segura
 * (em px de CSS) para padding em unidades do MUNDO VIRTUAL, considerando como o
 * Scale Manager (modo FIT, centralizado) encaixa o campo na tela.
 *
 * Só conta a parte do inset que de fato INVADE a área de jogo (o que cai no
 * letterbox não precisa de padding). O resultado é somado a uma base.
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function hudPadding(
  virtualW: number,
  virtualH: number,
  screenW: number,
  screenH: number,
  insets: Insets,
  base = 16,
): HudPadding {
  // FIT: a maior escala que cabe o campo inteiro na tela.
  const scale = Math.min(screenW / virtualW, screenH / virtualH);
  const dispW = virtualW * scale;
  const dispH = virtualH * scale;
  // Letterbox (px de CSS) em cada eixo, por causa da centralização.
  const offsetX = (screenW - dispW) / 2;
  const offsetY = (screenH - dispH) / 2;

  // Quanto de cada inset realmente invade o campo, convertido p/ virtual.
  const intrude = (insetCss: number, offsetCss: number): number =>
    Math.max(0, insetCss - offsetCss) / scale;

  return {
    top: base + intrude(insets.top, offsetY),
    right: base + intrude(insets.right, offsetX),
    bottom: base + intrude(insets.bottom, offsetY),
    left: base + intrude(insets.left, offsetX),
  };
}
