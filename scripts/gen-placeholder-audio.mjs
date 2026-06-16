// gen-placeholder-audio.mjs — gera PLACEHOLDERS de áudio do tema "Polido"
// (P10-12) em public/audio/. São tons sintéticos curtos (mono, 22050 Hz, 16-bit
// PCM WAV) só para VALIDAR o fluxo de samples de ponta a ponta (carga →
// decode → AudioBufferSource → cross-fade). NÃO são o conteúdo final: o áudio
// definitivo (SFX/faixas mixadas) é conteúdo e substitui estes arquivos nos
// mesmos caminhos/chaves, sem mudar código. Reexecutar: `node scripts/gen-placeholder-audio.mjs`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
const RATE = 22050;

// Envelope determinístico (sem Math.random — placeholders, mas mantemos o hábito).
function tone({ seconds, freq, type = 'sine', attack = 0.005, decay = null, gain = 0.5 }) {
  const n = Math.floor(seconds * RATE);
  const data = new Float32Array(n);
  const release = decay ?? seconds;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let s;
    switch (type) {
      case 'square':
        s = Math.sign(Math.sin(2 * Math.PI * freq * t));
        break;
      case 'saw':
        s = 2 * ((t * freq) % 1) - 1;
        break;
      case 'noise':
        // LCG determinístico (placeholder de ruído).
        s = (((i * 1103515245 + 12345) >>> 8) / 0x7fffff) % 2 - 1;
        break;
      default:
        s = Math.sin(2 * Math.PI * freq * t);
    }
    const env = Math.min(1, t / attack) * Math.max(0, 1 - t / release);
    data[i] = s * env * gain;
  }
  return data;
}

// Loop de música: mistura de senóides, com fade nas bordas para casar o loop.
function pad(seconds, freqs, gain) {
  const n = Math.floor(seconds * RATE);
  const data = new Float32Array(n);
  const edge = Math.floor(0.05 * RATE);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
    s /= freqs.length;
    let env = gain;
    if (i < edge) env *= i / edge;
    else if (i > n - edge) env *= (n - i) / edge;
    data[i] = s * env;
  }
  return data;
}

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), buf);
  console.log(`  ${name} — ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('Gerando placeholders de áudio (P10-12) em public/audio/:');
// SFX (curtos) por cue.
writeWav('sfx-kill.wav', tone({ seconds: 0.18, freq: 320, type: 'square', gain: 0.5 }));
writeWav('sfx-hit.wav', tone({ seconds: 0.22, freq: 140, type: 'saw', gain: 0.5 }));
writeWav('sfx-graze.wav', tone({ seconds: 0.08, freq: 1400, type: 'sine', gain: 0.4 }));
writeWav('sfx-pulse.wav', tone({ seconds: 0.3, freq: 900, type: 'sine', gain: 0.45 }));
// Faixas de trilha (loops curtos) — cross-fade calm↔intense.
writeWav('music-default-calm.wav', pad(2, [55, 82.5, 110], 0.5));
writeWav('music-default-intense.wav', pad(2, [110, 146.83, 220], 0.55));
console.log('OK.');
