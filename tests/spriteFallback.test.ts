import { describe, it, expect } from 'vitest';
import {
  resolveSpriteSource,
  resolveShipSprite,
  shipVariantKey,
  spriteKey,
  SPRITE_CATEGORIES,
  type SpriteCategory,
} from '../src/render/spriteFallback';

describe('spriteFallback — resolução asset×fallback do SpriteTheme (P10-09)', () => {
  it('a chave segue a convenção spr-<categoria>', () => {
    expect(spriteKey('ship')).toBe('spr-ship');
    expect(spriteKey('enemy')).toBe('spr-enemy');
    expect(spriteKey('boss')).toBe('spr-boss');
  });

  it('manifesto vazio ⇒ toda categoria cai no vetorial (req 1/fallback total)', () => {
    for (const c of SPRITE_CATEGORIES) {
      const src = resolveSpriteSource(new Set<string>(), c);
      expect(src.useSprite).toBe(false);
      expect(src.key).toBe(spriteKey(c));
      expect(src.category).toBe(c);
    }
  });

  it('só a categoria com sprite registrado usa sprite; o resto cai no vetorial', () => {
    // Espelha o critério de aceite: nave como sprite, resto vetorial.
    const available = new Set([spriteKey('ship')]);
    expect(resolveSpriteSource(available, 'ship').useSprite).toBe(true);
    expect(resolveSpriteSource(available, 'enemy').useSprite).toBe(false);
    expect(resolveSpriteSource(available, 'boss').useSprite).toBe(false);
  });

  it('aceita qualquer iterável de chaves (array), não só Set', () => {
    const src = resolveSpriteSource(['spr-enemy'], 'enemy');
    expect(src.useSprite).toBe(true);
  });

  it('chave desconhecida no manifesto não habilita categoria alguma', () => {
    const available = new Set(['spr-desconhecido', 'outra-coisa']);
    for (const c of SPRITE_CATEGORIES) {
      expect(resolveSpriteSource(available, c as SpriteCategory).useSprite).toBe(false);
    }
  });
});

describe('spriteFallback — nave × cosmético no tema sprite (P10-13)', () => {
  it('a variante curada segue a convenção spr-ship-<id>', () => {
    expect(shipVariantKey('ship-prism')).toBe('spr-ship-ship-prism');
    expect(shipVariantKey('ship-default')).toBe('spr-ship-ship-default');
  });

  it('sem nenhum sprite de nave ⇒ fallback vetorial (curated=false)', () => {
    const src = resolveShipSprite(new Set<string>(), 'ship-prism');
    expect(src).toEqual({ key: spriteKey('ship'), useSprite: false, curated: false });
  });

  it('só a arte default presente ⇒ usa a default tingida (não curada)', () => {
    const src = resolveShipSprite(new Set([spriteKey('ship')]), 'ship-prism');
    expect(src).toEqual({ key: spriteKey('ship'), useSprite: true, curated: false });
  });

  it('variante curada presente ⇒ usa a variante (curated=true), priorizada sobre a default', () => {
    const available = new Set([spriteKey('ship'), shipVariantKey('ship-prism')]);
    const src = resolveShipSprite(available, 'ship-prism');
    expect(src).toEqual({ key: shipVariantKey('ship-prism'), useSprite: true, curated: true });
    // Outro cosmético sem variante própria cai na default, ainda que exista a do prisma.
    const other = resolveShipSprite(available, 'ship-comet');
    expect(other).toEqual({ key: spriteKey('ship'), useSprite: true, curated: false });
  });

  it('aceita array de chaves (não só Set)', () => {
    const src = resolveShipSprite([shipVariantKey('ship-comet')], 'ship-comet');
    expect(src.useSprite).toBe(true);
    expect(src.curated).toBe(true);
  });
});
