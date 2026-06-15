// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputService, type ViewportMapper } from '../src/services/InputService';

// Mapeador identidade: tela = mundo, simplifica as asserções.
const identityMapper: ViewportMapper = {
  toWorld: (x, y) => ({ x, y }),
};

function pointer(type: string, props: Partial<PointerEvent>): PointerEvent {
  return new PointerEvent(type, { bubbles: true, pointerType: 'touch', ...props });
}

describe('InputService — canal de input abstrato (docs/02 §5.4)', () => {
  let el: HTMLElement;
  let svc: InputService;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    svc = new InputService(el, identityMapper);
    svc.attach();
  });

  afterEach(() => {
    svc.detach();
    el.remove();
  });

  it('arrastar o MOUSE emite eventos lógicos "move" no mundo virtual', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));

    // Mouse é sempre absoluto (persegue o cursor), default ou não.
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 200 }));
    el.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', clientX: 150, clientY: 260 }));

    expect(moves).toEqual([
      { x: 100, y: 200 },
      { x: 150, y: 260 },
    ]);
  });

  it('não emite "move" ao mover sem estar arrastando', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));
    el.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 10 }));
    expect(moves).toHaveLength(0);
  });

  it('botão direito do mouse liga/desliga o modo Foco', () => {
    const focus: boolean[] = [];
    svc.on('focus', (f) => focus.push(f));

    el.dispatchEvent(
      pointer('pointerdown', { pointerType: 'mouse', button: 2, clientX: 5, clientY: 5 }),
    );
    expect(svc.focus).toBe(true);
    window.dispatchEvent(pointer('pointerup', { pointerType: 'mouse' }));
    expect(svc.focus).toBe(false);
    expect(focus).toEqual([true, false]);
  });

  it('tecla Shift ativa o modo Foco (evento lógico, não bruto)', () => {
    const focus: boolean[] = [];
    svc.on('focus', (f) => focus.push(f));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    expect(svc.focus).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    expect(svc.focus).toBe(false);
    expect(focus).toEqual([true, false]);
  });

  it('tecla de pulso e requestPulse() emitem o evento lógico "pulse"', () => {
    let count = 0;
    svc.on('pulse', () => count++);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // espaço
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    svc.requestPulse(); // botão na tela
    expect(count).toBe(3);
  });

  it('movimento por teclado é contínuo e integra no update(dt)', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    svc.update(1); // 1 segundo, velocidade padrão 900 px/s
    expect(moves.at(-1)).toEqual({ x: 900, y: 0 });

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    moves.length = 0;
    svc.update(1);
    expect(moves).toHaveLength(0); // sem direção → nada emitido
  });

  it('detach() remove os listeners (sem vazamento)', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));
    svc.detach();
    el.dispatchEvent(pointer('pointerdown', { clientX: 1, clientY: 1 }));
    expect(moves).toHaveLength(0);
  });
});

describe('InputService — controle de toque RELATIVO (P10-01)', () => {
  let el: HTMLElement;
  let svc: InputService;
  let moves: Array<{ x: number; y: number }>;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    svc = new InputService(el, identityMapper, {
      touchScheme: 'relative',
      sensitivity: 1,
      focusSensitivityFactor: 0.5,
      bounds: { width: 1000, height: 1000 },
    });
    svc.attach();
    moves = [];
    svc.on('move', (m) => moves.push(m));
  });

  afterEach(() => {
    svc.detach();
    el.remove();
  });

  it('pointerdown NÃO pula a nave para o dedo (não emite move absoluto)', () => {
    svc.seedTarget(500, 500);
    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 200 }));
    expect(moves).toHaveLength(0);
    expect(svc.moveTarget).toEqual({ x: 500, y: 500 });
  });

  it('arrastar move por delta a partir do alvo ancorado (base + Σdeltas)', () => {
    svc.seedTarget(500, 500);
    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 130, clientY: 90 })); // Δ(+30,-10)
    el.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 90 })); // Δ(+20, 0)
    expect(moves).toEqual([
      { x: 530, y: 490 },
      { x: 550, y: 490 },
    ]);
  });

  it('novo pointerdown reancora (não dá salto ao soltar e tocar de novo)', () => {
    svc.seedTarget(500, 500);
    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 100 })); // alvo → 600
    window.dispatchEvent(pointer('pointerup', {}));
    moves.length = 0;
    // Toca longe; não deve saltar — só conta o delta a partir deste novo toque.
    el.dispatchEvent(pointer('pointerdown', { clientX: 900, clientY: 900 }));
    expect(moves).toHaveLength(0);
    el.dispatchEvent(pointer('pointermove', { clientX: 910, clientY: 900 })); // Δ(+10,0)
    expect(moves).toEqual([{ x: 610, y: 500 }]);
  });

  it('modo Foco reduz a sensibilidade pelo fator configurado', () => {
    svc.seedTarget(500, 500);
    // Foco via tecla Shift (default focusKeys).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 100 })); // Δ100 × 0.5
    expect(moves).toEqual([{ x: 550, y: 500 }]);
  });

  it('clampa a âncora aos limites do mundo (não acumula além da parede)', () => {
    svc.seedTarget(990, 500);
    el.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 0 })); // tenta 1090 → clampa 1000
    expect(moves.at(-1)).toEqual({ x: 1000, y: 500 });
  });

  it('o MOUSE permanece absoluto mesmo com esquema relativo', () => {
    svc.seedTarget(500, 500);
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 200 }));
    expect(moves).toEqual([{ x: 100, y: 200 }]);
  });
});

describe('InputService — esquema ABSOLUTO no toque (legado, opt-in)', () => {
  let el: HTMLElement;
  let svc: InputService;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    svc = new InputService(el, identityMapper, { touchScheme: 'absolute' });
    svc.attach();
  });

  afterEach(() => {
    svc.detach();
    el.remove();
  });

  it('o toque persegue o dedo (comportamento anterior preservado)', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));
    svc.seedTarget(500, 500);
    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 200 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 260 }));
    expect(moves).toEqual([
      { x: 100, y: 200 },
      { x: 150, y: 260 },
    ]);
  });
});
