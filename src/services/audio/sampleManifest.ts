import type { AudioCue } from '../../systems/AudioCues';
import type { LayerGains } from '../MusicDirector';

/**
 * sampleManifest — convenção de chaves + mapeamento PURO do tema de áudio por
 * samples (P10-12). Sem Web Audio e sem Phaser: testável headless e fonte única
 * das chaves que o manifesto do tema (`config/themes`) registra, que o
 * `PreloadScene` decodifica e que o `SampleAudioTheme` consome.
 *
 * Espelha `render/spriteFallback`: a convenção de chave casa o manifesto, o
 * cache e o consumidor, deixando o conteúdo (SFX/faixas finais) entrar
 * incrementalmente — basta a chave existir no bank. Ver TD-30.
 */

/** Chave de cache de um SFX por cue (convenção `aud-sfx-<cue>`). */
export function sfxKey(cue: AudioCue): string {
  return `aud-sfx-${cue}`;
}

/**
 * Faixas da trilha: a dinâmica em 4 camadas do `MusicDirector` (puro) é mapeada
 * para um **cross-fade** entre duas faixas pré-mixadas — `calm` (pad/ambiente) e
 * `intense` (com rítmica/tensão). Faixas pré-mixadas perdem a granularidade das
 * camadas, mas evitam multiplicar o peso/conteúdo; o trade-off está em TD-30.
 */
export type MusicTrack = 'calm' | 'intense';
export const MUSIC_TRACKS: readonly MusicTrack[] = ['calm', 'intense'];

/** Chave de cache de uma faixa por preset (convenção `aud-music-<preset>-<faixa>`). */
export function musicKey(preset: string, track: MusicTrack): string {
  return `aud-music-${preset}-${track}`;
}

/** Ganhos das duas faixas no cross-fade (somam ≤ 1; ambas 0 = música esvaziada). */
export interface TrackMix {
  readonly calm: number;
  readonly intense: number;
}

/**
 * Mapeia os ganhos-alvo por camada (do `MusicDirector`) para o cross-fade das
 * duas faixas. PURO/determinístico. Regras alinhadas com a semântica das
 * camadas (ver `musicTargets`):
 *  - `base` ausente ⇒ música esvaziada (game over) → ambas em 0;
 *  - tensão (chefe) ou perigo (vida baixa) ⇒ totalmente intensa;
 *  - rítmica presente ⇒ meio-termo (50/50);
 *  - só base ⇒ totalmente calma.
 * O cross-fade soma 1 (preserva volume percebido entre os extremos).
 */
export function trackMix(targets: LayerGains): TrackMix {
  if (targets.base <= 0) return { calm: 0, intense: 0 };
  const intensity = targets.tension > 0 || targets.danger > 0 ? 1 : targets.rhythm > 0 ? 0.5 : 0;
  return { calm: 1 - intensity, intense: intensity };
}
