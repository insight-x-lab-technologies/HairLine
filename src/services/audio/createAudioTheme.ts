import type { AudioTheme } from './AudioTheme';
import { SynthAudioTheme } from './SynthAudioTheme';
import { SampleAudioTheme } from './SampleAudioTheme';

/** Id do tema de áudio default — o do tema de apresentação default (arcade). */
export const DEFAULT_AUDIO_THEME_ID = 'synth';

/**
 * createAudioTheme — resolve o `audioThemeId` do registro de temas (P10-04) para
 * a implementação concreta de `AudioTheme`. Espelha `render/createRenderer`: o
 * registro (`config/themes`) fica dado puro e a costura id→implementação mora
 * aqui, no domínio de áudio.
 *
 * `synth` = síntese procedural histórica (arcade). `sample` = tema por samples
 * (P10-12, par sonoro do "Polido"): toca buffers e CAI no synth onde faltar
 * conteúdo. Id desconhecido cai no synth (default seguro).
 */
export function createAudioTheme(audioThemeId: string): AudioTheme {
  switch (audioThemeId) {
    case 'sample':
      return new SampleAudioTheme();
    case 'synth':
    default:
      return new SynthAudioTheme();
  }
}
