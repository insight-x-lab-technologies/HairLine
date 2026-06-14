import { Rng } from '../services/Rng';

/**
 * ParticlePool — infraestrutura de partículas decorativas (P5-01-02), no mesmo
 * espírito de `BulletPool`/`EnemyPool`: capacidade fixa, pré-alocada, sem `new`
 * no loop. É APRESENTAÇÃO: não entra em `src/sim/`, não afeta `hashState()` nem
 * o replay. A estrutura de dados, porém, é lógica pura e testável headless (não
 * importa Phaser).
 *
 * Aleatoriedade decorativa (espalhamento de ângulo/velocidade) usa uma instância
 * **local** de `Rng` semeada — respeita o lint (proibido `Math.random`), fica
 * reproduzível em teste e NÃO vaza para a simulação (o Rng é privado do pool).
 *
 * Avanço por **tempo de render** (dtTicks derivado do delta de frame), não por
 * ticks da sim: é decorativo (decisão registrada em TECH_DECISIONS / na issue).
 * Saturação: quando cheio, novas partículas são **descartadas** (mais barato que
 * varrer pela mais antiga; sem impacto perceptível por serem efêmeras).
 */
export interface BurstOptions {
  x: number;
  y: number;
  count: number;
  /** Velocidade base em px/s. */
  speed: number;
  lifeTicks: number;
  size: number;
  /** Cor 0xRRGGBB. */
  color: number;
  /** Direção base do leque (rad). Default 0. */
  angleRad?: number;
  /** Abertura do leque (rad). Default 2π (radial). */
  spreadRad?: number;
  /** Fator de atrito por tick (1 = sem atrito). Default 1. */
  drag?: number;
  /** Aceleração vertical px/tick² (queda). Default 0. */
  gravity?: number;
}

export class ParticlePool {
  readonly capacity: number;
  // Arrays paralelos (struct-of-arrays) — GC-friendly, sem objetos por partícula.
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly size0: Float32Array;
  private readonly drag: Float32Array;
  private readonly gravity: Float32Array;
  private readonly color: Int32Array;
  private readonly active: Uint8Array;
  private count = 0;
  private readonly rng: Rng;

  constructor(capacity = 512, seed = 0x9e3779b9) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.color = new Int32Array(capacity);
    this.active = new Uint8Array(capacity);
    this.rng = new Rng(seed >>> 0);
  }

  get activeCount(): number {
    return this.count;
  }

  /** Emite `count` partículas a partir de uma origem. Sem alocação. */
  burst(o: BurstOptions): void {
    const spread = o.spreadRad ?? Math.PI * 2;
    const base = o.angleRad ?? 0;
    const drag = o.drag ?? 1;
    const gravity = o.gravity ?? 0;
    // Velocidade em px por tick (a integração usa dtTicks). 60 Hz de referência.
    const speedPerTick = o.speed / 60;
    for (let n = 0; n < o.count; n++) {
      const idx = this.allocate();
      if (idx < 0) return; // saturado: descarta o restante
      const ang = base + this.rng.range(-spread / 2, spread / 2);
      const spd = speedPerTick * this.rng.range(0.5, 1);
      this.x[idx] = o.x;
      this.y[idx] = o.y;
      this.vx[idx] = Math.cos(ang) * spd;
      this.vy[idx] = Math.sin(ang) * spd;
      this.age[idx] = 0;
      this.life[idx] = o.lifeTicks;
      this.size0[idx] = o.size;
      this.drag[idx] = drag;
      this.gravity[idx] = gravity;
      this.color[idx] = o.color | 0;
      this.active[idx] = 1;
    }
  }

  /** Avança todas as partículas em `dtTicks` e desativa as vencidas. */
  update(dtTicks: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      this.vx[i]! *= Math.pow(this.drag[i]!, dtTicks);
      this.vy[i] = this.vy[i]! * Math.pow(this.drag[i]!, dtTicks) + this.gravity[i]! * dtTicks;
      this.x[i]! += this.vx[i]! * dtTicks;
      this.y[i]! += this.vy[i]! * dtTicks;
      this.age[i]! += dtTicks;
      if (this.age[i]! >= this.life[i]!) {
        this.active[i] = 0;
        this.count--;
      }
    }
  }

  /**
   * Percorre as partículas vivas com seus parâmetros de desenho (alpha e size
   * decaem monotonicamente ao longo da vida).
   */
  forEachActive(
    cb: (x: number, y: number, size: number, color: number, alpha: number) => void,
  ): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      const t = this.age[i]! / this.life[i]!; // 0→1
      const alpha = 1 - t;
      const size = this.size0[i]! * (1 - 0.5 * t);
      cb(this.x[i]!, this.y[i]!, size, this.color[i]!, alpha);
    }
  }

  /** Desativa tudo (ex.: troca de cena). */
  reset(): void {
    this.active.fill(0);
    this.count = 0;
  }

  /** Primeiro slot livre, ou -1 se cheio (sem alocação). */
  private allocate(): number {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) {
        this.count++;
        return i;
      }
    }
    return -1;
  }
}
