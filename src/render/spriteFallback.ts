/**
 * spriteFallback — resolução PURA asset×fallback do tema "Polido" (P10-09).
 *
 * O `SpriteTheme` desenha sprites onde houver asset e CAI no vetorial onde
 * faltar. A decisão "tem sprite ou cai no vetorial?" é uma função pura, isolada
 * aqui para ser testável headless (sem Phaser): dado o conjunto de chaves de
 * textura DISPONÍVEIS e uma categoria de entidade, diz se desenha por sprite.
 *
 * Convenção de chave: `spr-<categoria>` (ex.: `spr-ship`). Mantida estável para
 * casar com o manifesto do tema (`config/themes`) e o cache do Phaser. Assim a
 * arte pode entrar incrementalmente (P10-10/11): basta registrar a chave; até
 * lá, a categoria cai no vetorial e nada quebra.
 */

/** Categorias de entidade que podem ganhar sprite (balas/anel seguem vetoriais). */
export type SpriteCategory = 'ship' | 'enemy' | 'boss';

/** Todas as categorias suportadas, na ordem de avaliação. */
export const SPRITE_CATEGORIES: readonly SpriteCategory[] = ['ship', 'enemy', 'boss'];

/** Chave de textura por categoria (convenção `spr-<categoria>`). */
export function spriteKey(category: SpriteCategory): string {
  return `spr-${category}`;
}

/** Resultado da resolução: usar sprite (true) ou cair no vetorial (false). */
export interface SpriteSource {
  readonly category: SpriteCategory;
  readonly key: string;
  readonly useSprite: boolean;
}

/**
 * Resolve a fonte de desenho de uma categoria: usa sprite se a chave dela estiver
 * entre as texturas disponíveis; senão sinaliza fallback vetorial. Função pura.
 */
export function resolveSpriteSource(
  available: Iterable<string>,
  category: SpriteCategory,
): SpriteSource {
  const set = available instanceof Set ? available : new Set(available);
  const key = spriteKey(category);
  return { category, key, useSprite: set.has(key) };
}

/**
 * Chave da VARIANTE de arte curada de uma nave cosmética (P10-13): convenção
 * `spr-ship-<cosmeticId>` (ex.: `spr-ship-ship-prism`). Registrar essa chave no
 * manifesto do tema habilita a silhueta curada daquele cosmético no tema sprite;
 * sem ela, a nave cai na arte default (`spr-ship`) tingida pela cor — e, sem
 * nenhum sprite de nave, na silhueta vetorial. Curadoria > multiplicar conteúdo:
 * arte é exigida só para os cosméticos que se escolhe curar, nunca para todos.
 */
export function shipVariantKey(cosmeticId: string): string {
  return `spr-ship-${cosmeticId}`;
}

/** Fonte de desenho da nave no tema sprite (curada → default → vetorial). */
export interface ShipSpriteSource {
  /** Textura a usar quando `useSprite` (variante curada OU default). */
  readonly key: string;
  /** Desenhar por sprite (true) ou cair na silhueta vetorial (false). */
  readonly useSprite: boolean;
  /** A textura é a variante curada do cosmético (true) ou a default (false). */
  readonly curated: boolean;
}

/**
 * Resolve a fonte da nave no tema sprite a partir do id do cosmético e das
 * texturas disponíveis — a regra tema×cosmético do P10-13, isolada aqui como
 * função PURA (sem Phaser, testável headless):
 *  1. variante curada `spr-ship-<id>` se registrada;
 *  2. senão a arte default `spr-ship` (tingida pela cor do cosmético);
 *  3. senão fallback vetorial (silhueta com acento de forma do cosmético).
 * Em 1–2 a cor do cosmético é aplicada por `setTint` (a cor SEMPRE herda); só a
 * forma da nave depende de haver variante curada — sem ela, a silhueta sprite é
 * a default, evitando exigir arte por cosmético (sem explosão combinatória).
 */
export function resolveShipSprite(
  available: Iterable<string>,
  cosmeticId: string,
): ShipSpriteSource {
  const set = available instanceof Set ? available : new Set(available);
  const variant = shipVariantKey(cosmeticId);
  if (set.has(variant)) return { key: variant, useSprite: true, curated: true };
  const base = spriteKey('ship');
  if (set.has(base)) return { key: base, useSprite: true, curated: false };
  return { key: base, useSprite: false, curated: false };
}
