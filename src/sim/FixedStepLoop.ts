/**
 * FixedStepLoop — acumulador de tempo para fixed timestep (docs/02 §3.1).
 *
 * Converte o tempo de parede variável (delta do requestAnimationFrame, que
 * oscila com o FPS) em uma quantidade inteira de ticks de tamanho FIXO. A
 * lógica de jogo nunca vê o delta cru: ela só é chamada em passos idênticos,
 * o que preserva o determinismo necessário ao Desafio Diário.
 *
 * Esta classe não conhece Phaser nem DOM — é testável headless.
 */
export class FixedStepLoop {
  /** Tempo acumulado ainda não consumido por um tick, em ms. */
  private accumulatorMs = 0;

  /**
   * @param fixedDeltaMs Tamanho de cada passo lógico, em ms (ex.: 1000/60).
   * @param onTick       Callback executado uma vez por passo fixo.
   * @param maxTicksPerAdvance Teto de ticks por chamada, evita a "espiral da
   *        morte" quando a aba volta do background com um delta gigante.
   */
  constructor(
    public readonly fixedDeltaMs: number,
    private readonly onTick: () => void,
    private readonly maxTicksPerAdvance = 240,
  ) {}

  /**
   * Avança o relógio em `frameDeltaMs` de tempo de parede, executando quantos
   * passos fixos couberem. O resíduo é guardado para o próximo frame.
   */
  advance(frameDeltaMs: number): void {
    this.accumulatorMs += frameDeltaMs;
    let ticks = 0;
    while (this.accumulatorMs >= this.fixedDeltaMs && ticks < this.maxTicksPerAdvance) {
      this.onTick();
      this.accumulatorMs -= this.fixedDeltaMs;
      ticks++;
    }
    // Se bateu o teto, descarta o excesso para não acumular dívida infinita.
    if (ticks >= this.maxTicksPerAdvance) {
      this.accumulatorMs = 0;
    }
  }

  /** Fração [0,1) do próximo passo já decorrida — para interpolar o render. */
  get alpha(): number {
    return this.accumulatorMs / this.fixedDeltaMs;
  }

  /** Zera o acumulador (ex.: ao pausar/retomar). */
  reset(): void {
    this.accumulatorMs = 0;
  }
}
