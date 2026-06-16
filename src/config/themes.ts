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
 * Temas registrados.
 *
 * - **arcade**: neon vetorial + synth, SEM assets (nada a carregar/precachear).
 * - **polido** (P10-09): renderer por sprites (`SpriteTheme`) que herda o
 *   vetorial e CAI nele onde faltar arte. O manifesto carrega só os assets do
 *   próprio tema (carga condicional no `PreloadScene`); o `vite-plugin-pwa`
 *   exclui esses assets do precache para não inchar o arcade. Áudio pelo tema
 *   `sample` (P10-12, `SampleAudioTheme`): toca por buffers e cai no synth onde
 *   faltar conteúdo. A chave de cada sprite segue `spr-<categoria>`
 *   (ver `render/spriteFallback`): registrar a chave habilita a categoria; o
 *   resto segue vetorial. Hoje só a **nave** tem placeholder ⇒ prova do fallback
 *   parcial (nave por sprite, inimigos/chefe vetoriais).
 */
const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'arcade',
    label: 'Arcade anos 80',
    rendererId: 'vector',
    audioThemeId: 'synth',
    assets: [],
  },
  {
    id: 'polido',
    label: 'Polido',
    rendererId: 'sprite',
    audioThemeId: 'sample',
    assets: [
      { key: 'spr-ship', url: 'sprites/ship-placeholder.svg', type: 'image' },
      // Fundo raster por camadas (P10-11): tileáveis, parallax por dados
      // (`render/parallaxBackground`). Carregam só no "polido"; fora do precache
      // PWA (path `sprites/`). Sem eles, o fundo cai no procedural (fallback).
      { key: 'spr-bg-far', url: 'sprites/bg-far.svg', type: 'image' },
      { key: 'spr-bg-nebula', url: 'sprites/bg-nebula.svg', type: 'image' },
      { key: 'spr-bg-near', url: 'sprites/bg-near.svg', type: 'image' },
      // Áudio por samples (P10-12): SFX por cue + faixas calm/intense do preset
      // `default` (cross-fade). Chaves seguem a convenção de `audio/sampleManifest`
      // (`aud-sfx-*` / `aud-music-*`). Carregam só no "polido"; fora do precache
      // PWA (path `audio/`). Sem cada buffer, o cue/trilha cai no synth (fallback
      // por cue — `SampleAudioTheme`). Placeholders validam o fluxo; o conteúdo
      // final é trocado nos mesmos caminhos, sem mudar código.
      { key: 'aud-sfx-kill', url: 'audio/sfx-kill.wav', type: 'audio' },
      { key: 'aud-sfx-hit', url: 'audio/sfx-hit.wav', type: 'audio' },
      { key: 'aud-sfx-graze', url: 'audio/sfx-graze.wav', type: 'audio' },
      { key: 'aud-sfx-pulse', url: 'audio/sfx-pulse.wav', type: 'audio' },
      { key: 'aud-music-default-calm', url: 'audio/music-default-calm.wav', type: 'audio' },
      { key: 'aud-music-default-intense', url: 'audio/music-default-intense.wav', type: 'audio' },
    ],
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
