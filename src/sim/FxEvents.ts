/**
 * FxEvents — buffer de eventos de FX com posição, emitido pela simulação para o
 * render (P5-01-03 / P5-02-01). Resolve a lacuna das `AudioCues` (que só dizem
 * QUE houve kill/hit/graze, não ONDE): aqui o evento carrega `x/y` e cor/raio do
 * alvo no tick em que aconteceu.
 *
 * **Decorativo e derivado:** NÃO entra no `hashState()` (os replays gravados
 * continuam válidos). O buffer é função pura do tick: zera o índice a cada tick
 * e os sistemas o preenchem nos pontos de colisão/graze. Pré-alocado — nunca
 * aloca no loop; ao saturar, descarta o excedente.
 *
 * Precedente: `sim.lastReflect` já é estado observável só do render.
 */
export type FxEventType = 'shotHit' | 'kill' | 'bossKill' | 'bossPhase' | 'playerHit' | 'graze';

/** Interface mínima que os sistemas recebem — mantém-nos desacoplados do buffer. */
export interface FxEmitter {
  emit(type: FxEventType, x: number, y: number, color?: string, radius?: number): void;
}

/** Um evento pré-alocado e reutilizado (mutável; nunca recriado no loop). */
export interface FxEvent {
  type: FxEventType;
  x: number;
  y: number;
  /** Cor herdada do alvo (hex) ou `undefined` (a cena usa a cor própria do tipo). */
  color: string | undefined;
  radius: number;
}

export class FxEventBuffer implements FxEmitter {
  readonly capacity: number;
  private readonly events: FxEvent[];
  private count = 0;

  constructor(capacity = 64) {
    this.capacity = capacity;
    this.events = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.events[i] = { type: 'kill', x: 0, y: 0, color: undefined, radius: 0 };
    }
  }

  /** Quantos eventos há no tick corrente. */
  get length(): number {
    return this.count;
  }

  /** Registra um evento. Descarta (sem alocar) se o buffer estiver cheio. */
  emit(type: FxEventType, x: number, y: number, color?: string, radius = 0): void {
    if (this.count >= this.capacity) return;
    const e = this.events[this.count]!;
    e.type = type;
    e.x = x;
    e.y = y;
    e.color = color;
    e.radius = radius;
    this.count++;
  }

  /** Zera o índice (início de cada tick). Não realoca. */
  reset(): void {
    this.count = 0;
  }

  /** Percorre os eventos do tick corrente, em ordem de emissão. */
  forEach(cb: (e: Readonly<FxEvent>) => void): void {
    for (let i = 0; i < this.count; i++) cb(this.events[i]!);
  }
}
