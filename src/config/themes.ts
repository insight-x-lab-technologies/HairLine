/**
 * themes — REGISTRO de temas de apresentação (P10-04). Fonte única que lista os
 * temas disponíveis para o seletor, o `PreloadScene` (carga condicional) e a
 * `GameScene` (resolver renderer/áudio). Um tema escolhe QUAL `GameRenderer`
 * (P10-02) e QUAL `AudioTheme` (P10-03) o jogo usa, mais o manifesto de assets a
 * carregar.
 *
 * **Estado do jogador, não do jogo.** O tema é apresentação pura (como mute/
 * cosméticos): mora no `SaveService`, NUNCA entra na simulação/replay/`hashState`
 * ou no ranking. Por isso este módulo é **dado puro** (sem Phaser/Web Audio): a
 * resolução id→implementação fica nas factories `render/createRenderer` e
 * `services/audio/createAudioTheme`, mantendo o registro testável headless e a
 * costura para o tema "Polido" (Bloco C — P10-09+) entrar sem editar o seletor.
 */

/** Asset a carregar para um tema (manifesto). Vazio no tema vetorial (synth). */
export interface ThemeAsset {
  /** Chave do cache do Phaser. */
  readonly key: string;
  /** URL/caminho relativo do asset. */
  readonly url: string;
  /** Como o `PreloadScene` deve carregar. (O "polido" amplia conforme precisar.) */
  readonly type: 'image' | 'audio';
}

/** Um tema registrado: id estável + rótulo + renderer/áudio associados + assets. */
export interface ThemeDefinition {
  /** Id estável persistido no `SaveService`. */
  readonly id: string;
  /** Rótulo exibido no seletor. */
  readonly label: string;
  /** Renderer associado, resolvido por `render/createRenderer`. */
  readonly rendererId: string;
  /** Tema de áudio associado, resolvido por `services/audio/createAudioTheme`. */
  readonly audioThemeId: string;
  /** Manifesto de assets do tema (vazio ⇒ nada além do que já existe). */
  readonly assets: readonly ThemeAsset[];
}

/** Tema default — usado quando não há escolha ou o valor persistido é inválido. */
export const DEFAULT_THEME_ID = 'arcade';

/**
 * Temas registrados. Hoje só o **arcade** (neon vetorial + synth, sem assets);
 * o "Polido" (sprite + samples) se registra aqui no Bloco C e aparece sozinho no
 * seletor.
 */
const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'arcade',
    label: 'Arcade anos 80',
    rendererId: 'vector',
    audioThemeId: 'synth',
    assets: [],
  },
];

/** Lista (imutável) dos temas registrados, na ordem de exibição. */
export function listThemes(): readonly ThemeDefinition[] {
  return THEMES;
}

/** O tema default (garantidamente registrado). */
export function defaultTheme(): ThemeDefinition {
  return THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? THEMES[0]!;
}

/**
 * Resolve um id para o tema correspondente; id ausente/desconhecido (save
 * corrompido, tema removido) cai no default sem quebrar. É aqui que mora a
 * validação — o `SaveService` guarda o id cru e delega a validade a este registro
 * (mesmo padrão da classe de nave).
 */
export function resolveTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? defaultTheme();
}

/** O id corresponde a um tema registrado? */
export function isKnownTheme(id: string | null | undefined): boolean {
  return THEMES.some((t) => t.id === id);
}
