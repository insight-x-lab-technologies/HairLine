/**
 * Rng — PRNG semeável determinístico (mulberry32).
 *
 * Determinismo é lei (docs/02 §3.1): TODA aleatoriedade que afeta o jogo passa
 * por aqui. É PROIBIDO usar Math.random() na lógica de jogo. A mesma seed
 * produz exatamente a mesma sequência em qualquer dispositivo — base do
 * Desafio Diário e do anti-cheat por re-simulação de replay (docs/02 §7).
 *
 * mulberry32: estado de 32 bits, rápido e simples, qualidade adequada para o
 * jogo. Escolha registrada como decisão fechada da Fase 0 (docs/02 §9).
 */
export class Rng {
  /** Estado interno de 32 bits (uint32). */
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Reinicia o gerador para o início da sequência da seed dada. */
  reset(seed: number): void {
    this.state = seed >>> 0;
  }

  /** Cópia independente que continua a sequência a partir do estado atual. */
  clone(): Rng {
    const r = new Rng(0);
    r.state = this.state;
    return r;
  }

  /** Próximo inteiro sem sinal de 32 bits [0, 2^32). É o passo base do PRNG. */
  nextUint32(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Próximo float em [0, 1). */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Float em [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Inteiro em [min, max] (ambos inclusivos). */
  intRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** true com probabilidade p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Elemento aleatório do array (assume array não vazio). */
  pick<T>(items: readonly T[]): T {
    return items[this.intRange(0, items.length - 1)] as T;
  }
}
