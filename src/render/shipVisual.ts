/**
 * shipVisual — mapeamento PURO estado-da-sim → transform de apresentação da nave
 * (P10-10). Tira os "números mágicos" do desenho da nave (escala no Foco, piscar
 * em i-frames, pulso da chama) para uma função sem Phaser, testável headless e
 * COMPARTILHADA pelo vetorial e pelo sprite: a nave de qualquer tema reage aos
 * mesmos estados do mesmo jeito (o tema só troca o CORPO; o feel é idêntico).
 *
 * É apresentação pura: lê estado autoritativo (Foco/i-frames) + tempo de parede;
 * nunca grava na sim, não entra em `hashState`/replay. Parte do "contrato de
 * asset" por entidade (ver `docs/ASSET_CONTRACT.md`): estados → variação visual.
 */

/** Escala uniforme do corpo da nave ao entrar em Foco (encolhe = alvo menor). */
export const SHIP_FOCUS_SCALE = 0.7;
/** Piscar em i-frames: alpha = base + amp·sin(t/period). */
const IFRAME_ALPHA_BASE = 0.35;
const IFRAME_ALPHA_AMP = 0.35;
const IFRAME_PERIOD_MS = 35;
/** Pulso da chama do motor (escala vertical): base + amp·sin(t/period). */
const ENGINE_BASE = 0.7;
const ENGINE_AMP = 0.3;
const ENGINE_PERIOD_MS = 60;

/** Transform de apresentação derivado do estado da sim para o frame. */
export interface ShipVisualState {
  /** Escala uniforme do corpo (1 normal; encolhe no Foco). */
  scale: number;
  /** Opacidade do corpo (1 normal; oscila em i-frames). */
  alpha: number;
  /** Escala vertical da chama do motor (pulsa sempre). */
  engineScaleY: number;
}

export interface ShipVisualInput {
  /** Modo Foco ativo (encolhe a nave). */
  focus: boolean;
  /** Nave invulnerável (i-frames) — pisca. */
  invulnerable: boolean;
  /** Tempo de parede do Phaser (ms) para as oscilações. */
  timeMs: number;
}

/**
 * Resolve o transform de apresentação da nave para o frame. Função pura: mesmas
 * entradas ⇒ mesma saída (testável sem Phaser). A escala da chama pulsa mesmo
 * fora de i-frames/Foco (vida do motor).
 */
export function shipVisualState(input: ShipVisualInput): ShipVisualState {
  const scale = input.focus ? SHIP_FOCUS_SCALE : 1;
  const alpha = input.invulnerable
    ? IFRAME_ALPHA_BASE + IFRAME_ALPHA_AMP * Math.sin(input.timeMs / IFRAME_PERIOD_MS)
    : 1;
  const engineScaleY = ENGINE_BASE + ENGINE_AMP * Math.sin(input.timeMs / ENGINE_PERIOD_MS);
  return { scale, alpha, engineScaleY };
}
