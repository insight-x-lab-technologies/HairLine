// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternal, shareGame, shareTargets } from '../src/ui/socialLinks';

const URL = 'https://hairline.example/play';
const TEXT = 'Jogue HAIRLINE';

describe('openExternal (jsdom)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('abre a URL em nova aba com noopener,noreferrer', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openExternal('https://ko-fi.com/x');
    expect(open).toHaveBeenCalledWith('https://ko-fi.com/x', '_blank', 'noopener,noreferrer');
  });
});

describe('shareGame routing (jsdom)', () => {
  const targets = shareTargets(URL, TEXT);
  const intent = targets.find((t) => t.id === 'whatsapp')!;
  const native = targets.find((t) => t.id === 'instagram')!;

  afterEach(() => {
    // Limpa o que cada teste injetou em navigator.
    // @ts-expect-error — remoção controlada para isolar os testes.
    delete navigator.share;
    // @ts-expect-error — idem.
    delete navigator.clipboard;
    vi.restoreAllMocks();
  });

  it('alvo de intent abre o deep link', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    expect(shareGame(intent, URL, TEXT)).toBe('intent');
    expect(open).toHaveBeenCalledWith(intent.url, '_blank', 'noopener,noreferrer');
  });

  it('alvo native usa Web Share API quando disponível', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    expect(shareGame(native, URL, TEXT)).toBe('native');
    expect(share).toHaveBeenCalledWith({ title: 'HAIRLINE', text: TEXT, url: URL });
  });

  it('alvo native sem Web Share copia o link', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(shareGame(native, URL, TEXT)).toBe('copy');
    expect(writeText).toHaveBeenCalledWith(`${TEXT} ${URL}`);
  });

  it('alvo native sem share nem clipboard abre a URL do jogo', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    expect(shareGame(native, URL, TEXT)).toBe('open');
    expect(open).toHaveBeenCalledWith(URL, '_blank', 'noopener,noreferrer');
  });
});
