import { describe, it, expect } from 'vitest';
import { shareTargets } from '../src/ui/socialLinks';

const URL = 'https://hairline.example/play';
const TEXT = 'Jogue HAIRLINE & amigos';

describe('shareTargets', () => {
  it('monta deep links de intent com texto/URL codificados', () => {
    const t = shareTargets(URL, TEXT);
    const u = encodeURIComponent(URL);
    const x = encodeURIComponent(TEXT);

    const wa = t.find((s) => s.id === 'whatsapp')!;
    expect(wa.kind).toBe('intent');
    expect(wa.url).toBe(`https://wa.me/?text=${x}%20${u}`);

    const tg = t.find((s) => s.id === 'telegram')!;
    expect(tg.url).toBe(`https://t.me/share/url?url=${u}&text=${x}`);

    const tw = t.find((s) => s.id === 'x')!;
    expect(tw.url).toBe(`https://twitter.com/intent/tweet?text=${x}&url=${u}`);
  });

  it('codifica caracteres especiais (& e espaço) no texto', () => {
    const wa = shareTargets(URL, TEXT).find((s) => s.id === 'whatsapp')!;
    expect(wa.url).toContain('%26'); // & escapado
    expect(wa.url).not.toContain('Jogue HAIRLINE & amigos'); // nada cru
  });

  it('Instagram/TikTok são "native" (sem intent web) e têm glifo', () => {
    const t = shareTargets(URL, TEXT);
    for (const id of ['instagram', 'tiktok']) {
      const target = t.find((s) => s.id === id)!;
      expect(target.kind).toBe('native');
      expect(target.url).toBeUndefined();
      expect(target.glyph.length).toBeGreaterThan(0);
    }
  });
});
