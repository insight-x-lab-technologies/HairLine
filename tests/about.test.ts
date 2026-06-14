import { describe, it, expect } from 'vitest';
import {
  GAME_VERSION,
  STUDIO,
  GAME_URL,
  DONATIONS,
  versionLine,
  copyrightLine,
  supportLinks,
} from '../src/config/about';

describe('about (metadados do jogo)', () => {
  it('expõe a versão injetada pelo build (define)', () => {
    expect(GAME_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(versionLine('1.2.3')).toBe('v1.2.3');
  });

  it('copyright deriva o ano e nomeia o estúdio', () => {
    expect(STUDIO).toBe('Insight X Lab Game Studio');
    expect(copyrightLine(2026)).toBe('© 2026 Insight X Lab Game Studio');
  });

  it('tem URL canônica do jogo', () => {
    expect(GAME_URL).toMatch(/^https:\/\//);
  });

  it('links de doação têm as URLs oficiais exatas (P6-06-04)', () => {
    expect(DONATIONS.kofi).toBe('https://ko-fi.com/insightxlabgamestudio');
    expect(DONATIONS.bmc).toBe('https://buymeacoffee.com/insight.x.lab.game.studio');
    const links = supportLinks();
    expect(links.map((l) => l.id)).toEqual(['kofi', 'bmc']);
    expect(links.find((l) => l.id === 'kofi')?.url).toBe(DONATIONS.kofi);
    expect(links.find((l) => l.id === 'bmc')?.url).toBe(DONATIONS.bmc);
  });
});
