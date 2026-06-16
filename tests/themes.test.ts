import { describe, it, expect } from 'vitest';
import {
  listThemes,
  resolveTheme,
  defaultTheme,
  isKnownTheme,
  DEFAULT_THEME_ID,
} from '../src/config/themes';

describe('themes — registro de temas de apresentação (P10-04)', () => {
  it('lista ao menos o tema arcade (vetorial + synth, sem assets)', () => {
    const themes = listThemes();
    const arcade = themes.find((t) => t.id === 'arcade');
    expect(arcade).toBeDefined();
    expect(arcade?.rendererId).toBe('vector');
    expect(arcade?.audioThemeId).toBe('synth');
    // Vetorial não tem manifesto: não regredir o peso de carga (req 4).
    expect(arcade?.assets).toEqual([]);
  });

  it('o default está registrado e é o tema default', () => {
    expect(isKnownTheme(DEFAULT_THEME_ID)).toBe(true);
    expect(defaultTheme().id).toBe(DEFAULT_THEME_ID);
  });

  it('ids são únicos e cada tema tem rótulo/renderer/áudio', () => {
    const ids = listThemes().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of listThemes()) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.rendererId.length).toBeGreaterThan(0);
      expect(t.audioThemeId.length).toBeGreaterThan(0);
    }
  });

  it('resolve um id conhecido para o próprio tema', () => {
    expect(resolveTheme('arcade').id).toBe('arcade');
  });

  it('id ausente/desconhecido/corrompido cai no default (req 2)', () => {
    expect(resolveTheme(null).id).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme('').id).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme('tema-que-nao-existe').id).toBe(DEFAULT_THEME_ID);
  });

  it('isKnownTheme reconhece só os registrados', () => {
    expect(isKnownTheme('arcade')).toBe(true);
    expect(isKnownTheme('tema-fantasma')).toBe(false);
    expect(isKnownTheme(null)).toBe(false);
  });

  it('o tema "polido" usa renderer por sprites + áudio por samples e só carrega os assets dele', () => {
    const polido = resolveTheme('polido');
    expect(polido.id).toBe('polido');
    expect(polido.rendererId).toBe('sprite');
    // Áudio por samples (P10-12): par sonoro do "Polido".
    expect(polido.audioThemeId).toBe('sample');
    // Manifesto do próprio tema (carga condicional/PWA por tema): sprites por
    // `spr-` (imagem) e áudio por `aud-` (samples — `audio/sampleManifest`).
    expect(polido.assets.length).toBeGreaterThan(0);
    for (const a of polido.assets) {
      if (a.type === 'audio') expect(a.key.startsWith('aud-')).toBe(true);
      else expect(a.key.startsWith('spr-')).toBe(true);
      expect(a.url.length).toBeGreaterThan(0);
    }
    // Cobre as duas categorias do manifesto (regressão: não perder o áudio).
    expect(polido.assets.some((a) => a.type === 'audio')).toBe(true);
    expect(polido.assets.some((a) => a.type === 'image')).toBe(true);
  });
});
