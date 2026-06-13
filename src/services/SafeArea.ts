/**
 * SafeArea — lê os insets de área segura do sistema (docs/02 §5.3).
 *
 * Notches, ilha dinâmica e barras de gestos definem `env(safe-area-inset-*)`.
 * O encaixe da resolução virtual já é feito pelo Scale Manager; este utilitário
 * expõe os insets em pixels de CSS para posicionar HUD/molduras fora dessas
 * zonas. Depende de DOM; não é usado pela simulação.
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let probe: HTMLDivElement | null = null;

function getProbe(): HTMLDivElement {
  if (probe) return probe;
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);';
  document.body.appendChild(el);
  probe = el;
  return el;
}

/** Insets atuais, em pixels de CSS. Zero onde o sistema não os define. */
export function readSafeAreaInsets(): Insets {
  const cs = getComputedStyle(getProbe());
  const px = (v: string): number => parseFloat(v) || 0;
  return {
    top: px(cs.paddingTop),
    right: px(cs.paddingRight),
    bottom: px(cs.paddingBottom),
    left: px(cs.paddingLeft),
  };
}
