import type Phaser from 'phaser';
import type { Simulation } from '../sim/Simulation';
import type { HudPadding } from '../ui/hudLayout';

/**
 * GameRenderer — contrato do TEMA DE RENDER do gameplay (P10-02).
 *
 * Toda a apresentação do mundo (nave, inimigos, chefe, balas, tiros, partículas,
 * anel de graze, barra de Foco, fundo estelar, fx do pulso) vive atrás desta
 * interface. A `GameScene` deixa de desenhar diretamente e passa a **delegar**
 * ao tema ativo; continua dona do ciclo de vida (loop, input, áudio, HUD textual,
 * botões, anúncios de estágio e hit-stop).
 *
 * Regras do contrato:
 * - **Presentation-only.** O tema só LÊ o estado autoritativo da `Simulation`
 *   (somente leitura) — nunca grava estado da sim, nunca entra em `hashState()`,
 *   replay ou ranking. Toda a aleatoriedade decorativa usa `Rng` (sem `Math.random`).
 * - **Por intenção, não por primitiva.** Os métodos descrevem O QUÊ desenhar
 *   (a nave em x,y; o inimigo na sua forma/cor), não COMO (`fillCircle`), para que
 *   uma implementação por sprites (P10-09) caiba sem reescrever o contrato.
 * - **Sem `new` no loop.** Pools/`Graphics`/containers são criados no `init` e
 *   redesenhados por frame.
 */

/** Loadout cosmético resolvido (apresentação) que o tema aplica ao desenhar. */
export interface ThemeCosmetics {
  /** Forma da nave (id de `ui/shapes`), ex.: `arrow`. */
  shipShape: string;
  /** Cor da nave (0xRRGGBB). */
  shipColor: number;
  /** Cor do tiro do jogador (0xRRGGBB). */
  shotColor: number;
}

/** Estado por frame que o tema precisa além do estado autoritativo da sim. */
export interface RenderContext {
  /** Tempo de parede do Phaser (ms), para animações render-side. */
  time: number;
  /** Modo foco ativo (escala da nave / brilho do anel de graze). */
  focus: boolean;
}

export interface GameRenderer {
  /** Cria os GameObjects/pools do tema na cena e aplica o loadout cosmético. */
  init(scene: Phaser.Scene, cosmetics: ThemeCosmetics): void;

  /** Atualiza o padding do HUD (safe-areas) — usado por barras posicionadas. */
  setHudPad(pad: HudPadding): void;

  /** Avança/desenha o fundo (parallax). Chamado todo frame, mesmo congelado. */
  updateBackground(deltaMs: number): void;

  /** Reage a um cue de áudio com efeitos visuais (shake/flash/ping de graze). */
  reactToCue(cue: string): void;

  /**
   * Consome o buffer de fx do último tick (partículas + micro-shake) e retorna
   * o hit-stop (ms) a aplicar. A acumulação do hit-stop fica na cena (controla o
   * loop da simulação). Chamar só quando NÃO congelado.
   */
  consumeFx(sim: Simulation): number;

  /**
   * Avança a animação decorativa (partículas, pings, blip do Foco). `dtTicks` é
   * o delta de frame em ticks da sim. Chamar só quando NÃO congelado.
   */
  advanceFx(sim: Simulation, dtTicks: number): void;

  /** Desenha o mundo do frame a partir do estado autoritativo da sim. */
  draw(sim: Simulation, ctx: RenderContext): void;

  /** Libera os recursos do tema (simétrico a `init`). */
  destroy(): void;
}
