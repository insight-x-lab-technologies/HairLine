/**
 * about — metadados do jogo e links externos (P6-06). Fonte ÚNICA de versão,
 * estúdio, URL canônica, frase de divulgação e links de doação. "Dados
 * separados de código" (CLAUDE.md): nada disso é hardcodado espalhado pelas
 * cenas. Render/UI puro — não toca a simulação.
 *
 * A versão vem do `package.json`, injetada no build via `define`
 * (`__APP_VERSION__`) em vite.config.ts / vitest.config.ts. O fallback defensivo
 * evita um ReferenceError caso o define falte em algum ambiente.
 */
export const GAME_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__.length > 0 ? __APP_VERSION__ : '0.0.0';

/** Estúdio responsável (usado no aviso de copyright). */
export const STUDIO = 'Insight X Lab Game Studio';

/** URL canônica do jogo (GitHub Pages — ver README). */
export const GAME_URL = 'https://insight-x-lab-technologies.github.io/HairLine';

/** Frase curta usada ao compartilhar o jogo (não confundir com ShareCard). */
export const SHARE_TEXT = 'HAIRLINE — bullet hell de graze com Desafio Diário. Bora jogar?';

/** Links de apoio/doação (P6-06-04) — URLs oficiais do estúdio. */
export const DONATIONS = {
  kofi: 'https://ko-fi.com/insightxlabgamestudio',
  bmc: 'https://buymeacoffee.com/insight.x.lab.game.studio',
} as const;

/** Linha de versão exibida no rodapé (ex.: "v0.1.0"). */
export function versionLine(version = GAME_VERSION): string {
  return `v${version}`;
}

/** Aviso de copyright; ano derivado (não fixo). */
export function copyrightLine(year = new Date().getFullYear()): string {
  return `© ${year} ${STUDIO}`;
}

export interface SupportLink {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly url: string;
}

/** Lista de links de doação, na ordem de exibição. */
export function supportLinks(): SupportLink[] {
  return [
    { id: 'kofi', label: 'Ko-fi', glyph: '♥', url: DONATIONS.kofi },
    { id: 'bmc', label: 'Buy Me a Coffee', glyph: '☕', url: DONATIONS.bmc },
  ];
}
