/**
 * sampleBank — registro singleton dos buffers de áudio decodificados do tema por
 * samples (P10-12). É a ponte entre o lado Phaser (que carrega/decodifica os
 * assets no `PreloadScene`) e o `SampleAudioTheme` (Phaser-agnóstico), espelhando
 * como o `SpriteTheme` lê texturas do cache do Phaser.
 *
 * Vive como módulo (não na simulação): áudio é apresentação pura, jamais toca o
 * determinismo. Vazio por padrão ⇒ o tema cai inteiro no synth (fallback). É
 * populado só quando o tema de samples está ativo (carga condicional por tema).
 */
export type SampleBank = ReadonlyMap<string, AudioBuffer>;

let bank: Map<string, AudioBuffer> = new Map();

/** Bank corrente (vazio até o `PreloadScene` decodificar o manifesto do tema). */
export function getSampleBank(): SampleBank {
  return bank;
}

/** Substitui o bank (chamado pelo `PreloadScene` ao montar o tema de samples). */
export function setSampleBank(next: Map<string, AudioBuffer>): void {
  bank = next;
}

/** Esvazia o bank (troca de tema / testes). */
export function clearSampleBank(): void {
  bank = new Map();
}
