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
  /**
   * Esquema de controle do TOQUE (P10-01). `'relative'` (default): a nave anda
   * pelo DELTA do arraste, mantendo o dedo afastado da hitbox. `'absolute'`: a
   * nave persegue o dedo (comportamento legado). O MOUSE é sempre absoluto
   * (cursor naturalmente deslocado), independentemente deste valor.
   */
  readonly touchScheme?: 'relative' | 'absolute';
  /** Multiplicador do delta de arraste no modo relativo. Default 1. */
  readonly sensitivity?: number;
  /** Fator de sensibilidade no modo Foco (precisão). Default 1 (sem mudança). */
  readonly focusSensitivityFactor?: number;
  /**
   * Limites do mundo virtual para clampar a âncora no modo relativo. Evita que
   * o alvo acumule muito além da parede e o arraste de volta "não responda".
   * A cena ainda aplica seu próprio clamp (área jogável/safe-area) por cima.
   */
  readonly bounds?: { readonly width: number; readonly height: number };
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

  /** Config do controle de toque (P10-01). */
  private touchScheme: 'relative' | 'absolute';
  private readonly sensitivity: number;
  private readonly focusSensitivityFactor: number;
  private readonly bounds: { width: number; height: number } | null;

  /** Estado de Foco efetivo (toque OU teclado). */
  private pointerFocus = false;
  private keyboardFocus = false;
  private dragging = false;
  /** Se o arraste corrente é relativo (decidido no pointerdown pelo tipo). */
  private dragRelative = false;
  /** Última posição do ponteiro no mundo (base do delta no modo relativo). */
  private readonly lastPointer = { x: 0, y: 0 };

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
    this.touchScheme = opts.touchScheme ?? 'relative';
    this.sensitivity = opts.sensitivity ?? 1;
    this.focusSensitivityFactor = opts.focusSensitivityFactor ?? 1;
    this.bounds = opts.bounds ? { width: opts.bounds.width, height: opts.bounds.height } : null;
  }

  /**
   * Semeia o alvo interno (ex.: posição inicial da nave) SEM emitir 'move'. No
   * modo relativo, o próximo `pointerdown` ancora a partir deste ponto, então a
   * nave não dá salto no primeiro toque. Chamar no início e ao reatachar.
   */
  seedTarget(x: number, y: number): void {
    this.target.x = x;
    this.target.y = y;
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
    // Mouse é sempre absoluto; o toque segue o esquema configurado (P10-01).
    this.dragRelative = e.pointerType !== 'mouse' && this.touchScheme === 'relative';
    // Segundo toque ativa Foco no celular; no mouse, o botão direito.
    if (e.pointerType === 'mouse' ? e.button === 2 : this.isSecondaryTouch()) {
      this.pointerFocus = true;
      this.emitFocus();
    }
    const w = this.mapper.toWorld(e.clientX, e.clientY);
    // (Re)ancora: no relativo NÃO pula a nave para o dedo — só registra o ponto
    // de toque como base do delta. No absoluto, mantém o salto legado.
    this.lastPointer.x = w.x;
    this.lastPointer.y = w.y;
    if (!this.dragRelative) this.emitMove(w.x, w.y);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const w = this.mapper.toWorld(e.clientX, e.clientY);
    if (!this.dragRelative) {
      this.emitMove(w.x, w.y);
      return;
    }
    // Relativo: alvo += (delta do dedo) × sensibilidade (reduzida no Foco). O
    // acúmulo é incremental a partir do alvo corrente — somar deltas com fator
    // constante equivale a base + Σdeltas × sensibilidade.
    const k = this.sensitivity * (this.focus ? this.focusSensitivityFactor : 1);
    const nx = this.clampAxis(this.target.x + (w.x - this.lastPointer.x) * k, 'width');
    const ny = this.clampAxis(this.target.y + (w.y - this.lastPointer.y) * k, 'height');
    this.lastPointer.x = w.x;
    this.lastPointer.y = w.y;
    this.emitMove(nx, ny);
  };

  private clampAxis(v: number, axis: 'width' | 'height'): number {
    if (!this.bounds) return v;
    const max = this.bounds[axis];
    return v < 0 ? 0 : v > max ? max : v;
  }

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
