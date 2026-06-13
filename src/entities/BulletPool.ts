import type { Bounds } from '../sim/Player';

/**
 * Bullet — uma bala da simulação. Estado puro (sem Phaser): posição,
 * velocidade (px/s), raio de colisão e flag de vida. O render espelha estes
 * dados; a lógica vive aqui (headless, determinística).
 */
export class Bullet {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Aceleração (px/s²) — habilita balas que aceleram/desaceleram/curvam. */
  ax = 0;
  ay = 0;
  radius = 0;
  alive = false;
  /** Já contabilizada como graze? Evita contar a mesma bala duas vezes. */
  grazed = false;
}

/**
 * BulletPool — pool de objetos pré-alocados (docs/02 §3.3).
 *
 * Bullet hell cria/destrói milhares de balas; instanciar no loop trava o
 * celular. Aqui as balas são alocadas UMA vez na construção e reaproveitadas:
 * `spawn` pega um slot livre, `step` integra e recicla as que saem do campo.
 * Nunca há `new Bullet()` durante o jogo.
 *
 * Determinismo: integração puramente aritmética em passo fixo; a ordem de
 * varredura é estável (índice crescente).
 */
export class BulletPool {
  readonly capacity: number;
  private readonly bullets: Bullet[];
  /** Pilha de índices livres (LIFO) — reaproveitamento O(1). */
  private readonly freeStack: number[];
  private active = 0;
  /** Folga além da borda antes de reciclar (px) — evita sumiço visível. */
  private readonly despawnMargin: number;

  constructor(capacity: number, despawnMargin = 48) {
    this.capacity = capacity;
    this.despawnMargin = despawnMargin;
    this.bullets = new Array(capacity);
    this.freeStack = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.bullets[i] = new Bullet();
      // Empilha em ordem reversa para que os primeiros spawns usem 0,1,2…
      this.freeStack[i] = capacity - 1 - i;
    }
  }

  get activeCount(): number {
    return this.active;
  }

  /**
   * Ativa uma bala em (x,y) com velocidade (vx,vy) px/s e raio dado.
   * Retorna a Bullet reaproveitada, ou `null` se o pool estiver cheio.
   */
  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    ax = 0,
    ay = 0,
  ): Bullet | null {
    const idx = this.freeStack.pop();
    if (idx === undefined) return null; // pool cheio: descarta (sem alocar)
    const b = this.bullets[idx]!;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.ax = ax;
    b.ay = ay;
    b.radius = radius;
    b.grazed = false;
    b.alive = true;
    this.active++;
    return b;
  }

  /** Integra todas as balas vivas e recicla as que saíram do campo. */
  step(dtSec: number, bounds: Bounds): void {
    const m = this.despawnMargin;
    for (let i = 0; i < this.capacity; i++) {
      const b = this.bullets[i]!;
      if (!b.alive) continue;
      // Integra aceleração antes da posição (semi-implícito, determinístico).
      b.vx += b.ax * dtSec;
      b.vy += b.ay * dtSec;
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      if (b.x < -m || b.x > bounds.w + m || b.y < -m || b.y > bounds.h + m) {
        this.recycle(i);
      }
    }
  }

  /** Executa `cb` para cada bala viva, em ordem de índice estável. */
  forEachActive(cb: (b: Bullet) => void): void {
    for (let i = 0; i < this.capacity; i++) {
      const b = this.bullets[i]!;
      if (b.alive) cb(b);
    }
  }

  /** Remove uma bala específica (ex.: acertou alvo, foi refletida). */
  despawn(bullet: Bullet): void {
    if (!bullet.alive) return;
    const idx = this.bullets.indexOf(bullet);
    if (idx >= 0) this.recycle(idx);
  }

  /** Devolve o slot `index` ao pool. */
  private recycle(index: number): void {
    const b = this.bullets[index]!;
    if (!b.alive) return;
    b.alive = false;
    this.freeStack.push(index);
    this.active--;
  }

  /** Desativa todas as balas e restaura a pilha de livres. */
  reset(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.bullets[i]!.alive = false;
      this.freeStack[i] = this.capacity - 1 - i;
    }
    this.freeStack.length = this.capacity;
    this.active = 0;
  }
}
