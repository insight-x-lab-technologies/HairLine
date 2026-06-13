/**
 * InputService — canal de entrada abstrato (docs/02 §5.4).
 *
 * Unifica toque (arrastar), mouse (arrastar) e teclado em EVENTOS LÓGICOS:
 *   - 'move'  → alvo de movimento em coordenadas do mundo virtual.
 *   - 'focus' → modo Foco ligado/desligado.
 *
 * A lógica de jogo só consome estes eventos abstratos, NUNCA eventos brutos de
 * dispositivo. Isso mantém a simulação testável e habilita o ReplayRecorder
 * (docs/02 §7). Nesta Fase 0 há apenas o CANAL de input — nenhuma regra de
 * jogo (mover nave, atirar, graze) vive aqui.
 *
 * Esta classe usa apenas APIs de DOM/eventos; não depende de Phaser e pode ser
 * exercitada em jsdom.
 */

export interface MoveEvent {
  /** Alvo desejado em coordenadas do mundo virtual (retrato). */
  readonly x: number;
  readonly y: number;
}

export interface InputEvents {
  move: MoveEvent;
  focus: boolean;
  /** Gatilho do pulso refletor (edge). Payload sempre true. */
  pulse: boolean;
}

type Listener<T> = (payload: T) => void;

/** Converte um ponto da tela física para o mundo virtual. */
export interface ViewportMapper {
  toWorld(clientX: number, clientY: number): { x: number; y: number };
}

export interface InputServiceOptions {
  /** Teclas (event.key) que ativam o modo Foco. */
  readonly focusKeys?: readonly string[];
  /** Teclas (event.key) que disparam o pulso refletor. */
  readonly pulseKeys?: readonly string[];
  /** Velocidade do movimento por teclado, em px do mundo por segundo. */
  readonly keyboardSpeed?: number;
}

const DEFAULT_FOCUS_KEYS = ['Shift', 'Control', 'z', 'Z'] as const;
const DEFAULT_PULSE_KEYS = [' ', 'x', 'X'] as const;

export class InputService {
  private readonly listeners: {
    move: Set<Listener<MoveEvent>>;
    focus: Set<Listener<boolean>>;
    pulse: Set<Listener<boolean>>;
  } = { move: new Set(), focus: new Set(), pulse: new Set() };

  private readonly focusKeys: ReadonlySet<string>;
  private readonly pulseKeys: ReadonlySet<string>;
  private readonly keyboardSpeed: number;

  /** Estado de Foco efetivo (toque OU teclado). */
  private pointerFocus = false;
  private keyboardFocus = false;
  private dragging = false;

  /** Direção atual do movimento por teclado: cada eixo em {-1, 0, 1}. */
  private readonly keyDir = { x: 0, y: 0 };
  /** Último alvo de movimento conhecido, no mundo virtual. */
  private readonly target = { x: 0, y: 0 };

  private bound = false;
  private readonly handlers: Array<[EventTarget, string, EventListener]> = [];

  constructor(
    private readonly el: HTMLElement,
    private readonly mapper: ViewportMapper,
    opts: InputServiceOptions = {},
  ) {
    this.focusKeys = new Set(opts.focusKeys ?? DEFAULT_FOCUS_KEYS);
    this.pulseKeys = new Set(opts.pulseKeys ?? DEFAULT_PULSE_KEYS);
    this.keyboardSpeed = opts.keyboardSpeed ?? 900;
  }

  // ---- Assinatura de eventos lógicos -------------------------------------

  on<K extends keyof InputEvents>(event: K, fn: Listener<InputEvents[K]>): () => void {
    (this.listeners[event] as Set<Listener<InputEvents[K]>>).add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof InputEvents>(event: K, fn: Listener<InputEvents[K]>): void {
    (this.listeners[event] as Set<Listener<InputEvents[K]>>).delete(fn);
  }

  private emitMove(x: number, y: number): void {
    this.target.x = x;
    this.target.y = y;
    for (const fn of this.listeners.move) fn({ x, y });
  }

  private emitFocus(): void {
    const value = this.pointerFocus || this.keyboardFocus;
    for (const fn of this.listeners.focus) fn(value);
  }

  private emitPulse(): void {
    for (const fn of this.listeners.pulse) fn(true);
  }

  /** Dispara o pulso a partir da UI (ex.: botão na tela / toque dedicado). */
  requestPulse(): void {
    this.emitPulse();
  }

  // ---- Ciclo de vida -----------------------------------------------------

  /** Liga os listeners de DOM. Idempotente. */
  attach(): void {
    if (this.bound) return;
    this.bound = true;
    this.add(this.el, 'pointerdown', this.onPointerDown as EventListener);
    this.add(this.el, 'pointermove', this.onPointerMove as EventListener);
    this.add(window, 'pointerup', this.onPointerUp as EventListener);
    this.add(window, 'pointercancel', this.onPointerUp as EventListener);
    this.add(window, 'keydown', this.onKeyDown as EventListener);
    this.add(window, 'keyup', this.onKeyUp as EventListener);
  }

  /** Desliga todos os listeners. */
  detach(): void {
    for (const [t, type, fn] of this.handlers) t.removeEventListener(type, fn);
    this.handlers.length = 0;
    this.bound = false;
    this.dragging = false;
  }

  private add(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn);
    this.handlers.push([target, type, fn]);
  }

  // ---- Ponteiro (toque + mouse, unificados via Pointer Events) -----------

  private onPointerDown = (e: PointerEvent): void => {
    this.dragging = true;
    // Segundo toque ativa Foco no celular; no mouse, o botão direito.
    if (e.pointerType === 'mouse' ? e.button === 2 : this.isSecondaryTouch()) {
      this.pointerFocus = true;
      this.emitFocus();
    }
    const w = this.mapper.toWorld(e.clientX, e.clientY);
    this.emitMove(w.x, w.y);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const w = this.mapper.toWorld(e.clientX, e.clientY);
    this.emitMove(w.x, w.y);
  };

  private onPointerUp = (): void => {
    this.dragging = false;
    if (this.pointerFocus) {
      this.pointerFocus = false;
      this.emitFocus();
    }
  };

  // Placeholder simples: refinamento de multitoque vem com o gameplay (Fase 1).
  private isSecondaryTouch(): boolean {
    return false;
  }

  // ---- Teclado -----------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (this.pulseKeys.has(e.key)) {
      this.emitPulse();
      return;
    }
    if (this.focusKeys.has(e.key) && !this.keyboardFocus) {
      this.keyboardFocus = true;
      this.emitFocus();
      return;
    }
    this.applyKeyDir(e.key, 1);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (this.focusKeys.has(e.key) && this.keyboardFocus) {
      this.keyboardFocus = false;
      this.emitFocus();
      return;
    }
    this.applyKeyDir(e.key, 0);
  };

  private applyKeyDir(key: string, active: 0 | 1): void {
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keyDir.x = active ? -1 : 0;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keyDir.x = active ? 1 : 0;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keyDir.y = active ? -1 : 0;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keyDir.y = active ? 1 : 0;
        break;
    }
  }

  /**
   * Integra o movimento por teclado ao longo do tempo. O loop de jogo chama
   * isto por frame com o delta de parede; emite 'move' se houver direção.
   * (Toque/mouse emitem 'move' diretamente no evento; teclado é contínuo.)
   */
  update(deltaSec: number): void {
    if (this.keyDir.x === 0 && this.keyDir.y === 0) return;
    const step = this.keyboardSpeed * deltaSec;
    this.emitMove(this.target.x + this.keyDir.x * step, this.target.y + this.keyDir.y * step);
  }

  /** Estado atual de Foco (toque OU teclado). */
  get focus(): boolean {
    return this.pointerFocus || this.keyboardFocus;
  }

  /** Último alvo de movimento conhecido (mundo virtual). */
  get moveTarget(): MoveEvent {
    return { x: this.target.x, y: this.target.y };
  }
}
