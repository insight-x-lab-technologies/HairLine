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

  it('arrastar (toque/mouse) emite eventos lógicos "move" no mundo virtual', () => {
    const moves: Array<{ x: number; y: number }> = [];
    svc.on('move', (m) => moves.push(m));

    el.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 200 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 260 }));

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
