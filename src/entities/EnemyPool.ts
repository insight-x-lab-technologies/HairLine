import type { Bounds } from '../sim/Player';
import type { Pattern } from '../content/types';

/**
 * Enemy — inimigo da simulação (estado puro, sem Phaser). Guarda também a
 * referência ao seu padrão de bala e a idade em ticks (a emissão de balas é
 * função determinística da idade — ver PatternSystem).
 */
export class Enemy {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  hp = 0;
  radius = 0;
  alive = false;
  ageTicks = 0;
  pattern: Pattern | null = null;
  /** Apresentação (não afeta a lógica): forma e cor neon. */
  shape = 'circle';
  color = '#ff5d8f';
  /** Invocado por um chefe como add (P4-02b-03): conta para maxAlive/limpeza. */
  summonedByBoss = false;
}

/**
 * EnemyPool — pool de inimigos pré-alocados (docs/02 §3.3), mesmo padrão do
 * BulletPool: alocação única, reaproveitamento O(1), varredura em ordem
 * estável (determinismo). `advance` move e envelhece; quem sai pela base é
 * reciclado. A emissão de balas é feita por um sistema externo (PatternSystem),
 * mantendo o pool sem dependência de balas/jogador.
 */
export class EnemyPool {
  readonly capacity: number;
  private readonly enemies: Enemy[];
  private readonly freeStack: number[];
  private active = 0;
  private readonly despawnMargin: number;

  constructor(capacity: number, despawnMargin = 64) {
    this.capacity = capacity;
    this.despawnMargin = despawnMargin;
    this.enemies = new Array(capacity);
    this.freeStack = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.enemies[i] = new Enemy();
      this.freeStack[i] = capacity - 1 - i;
    }
  }

  get activeCount(): number {
    return this.active;
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    hp: number,
    radius: number,
    pattern: Pattern,
  ): Enemy | null {
    const idx = this.freeStack.pop();
    if (idx === undefined) return null;
    const e = this.enemies[idx]!;
    e.x = x;
    e.y = y;
    e.vx = vx;
    e.vy = vy;
    e.hp = hp;
    e.radius = radius;
    e.pattern = pattern;
    e.ageTicks = 0;
    e.alive = true;
    e.summonedByBoss = false;
    this.active++;
    return e;
  }

  /** Move e envelhece todos os inimigos vivos; recicla os que saem do campo. */
  advance(dtSec: number, bounds: Bounds): void {
    const m = this.despawnMargin;
    for (let i = 0; i < this.capacity; i++) {
      const e = this.enemies[i]!;
      if (!e.alive) continue;
      e.x += e.vx * dtSec;
      e.y += e.vy * dtSec;
      e.ageTicks++;
      if (e.x < -m || e.x > bounds.w + m || e.y < -m || e.y > bounds.h + m) {
        this.recycleAt(i);
      }
    }
  }

  forEachActive(cb: (e: Enemy) => void): void {
    for (let i = 0; i < this.capacity; i++) {
      const e = this.enemies[i]!;
      if (e.alive) cb(e);
    }
  }

  /** Remove um inimigo (ex.: morto por tiro). */
  killAndRecycle(enemy: Enemy): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.pattern = null;
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.freeStack.push(idx);
    this.active--;
  }

  private recycleAt(index: number): void {
    const e = this.enemies[index]!;
    if (!e.alive) return;
    e.alive = false;
    e.pattern = null;
    this.freeStack.push(index);
    this.active--;
  }

  reset(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.enemies[i]!.alive = false;
      this.enemies[i]!.pattern = null;
      this.freeStack[i] = this.capacity - 1 - i;
    }
    this.freeStack.length = this.capacity;
    this.active = 0;
  }
}
