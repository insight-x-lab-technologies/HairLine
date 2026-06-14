import { describe, it, expect } from 'vitest';
import {
  isUnlocked,
  getLoadout,
  getDefault,
  canSelect,
  selectCosmetic,
  findCosmetic,
  validateCosmetics,
  EMPTY_PROFILE,
  type CosmeticCatalog,
  type CosmeticProfile,
} from '../src/services/Cosmetics';

/** Catálogo sintético mínimo e válido, cobrindo os 3 tipos de unlock. */
function catalog(): CosmeticCatalog {
  return {
    ships: [
      { id: 'ship-default', kind: 'ship', title: 'Padrão', shape: 'arrow', color: '#0bd3c6', unlock: { type: 'default' } },
      {
        id: 'ship-prism',
        kind: 'ship',
        title: 'Prisma',
        shape: 'diamond',
        color: '#a78bfa',
        unlock: { type: 'totalAtLeast', stat: 'totalGraze', value: 500 },
      },
    ],
    shotColors: [
      { id: 'shot-default', kind: 'shotColor', title: 'Padrão', color: '#ffe066', unlock: { type: 'default' } },
      {
        id: 'shot-ach',
        kind: 'shotColor',
        title: 'Conquista',
        color: '#a3e635',
        unlock: { type: 'achievement', achievementId: 'ach-first-boss' },
      },
    ],
    music: [
      { id: 'music-default', kind: 'music', title: 'Padrão', preset: 'default', unlock: { type: 'default' } },
    ],
  };
}

function profile(p: Partial<CosmeticProfile>): CosmeticProfile {
  return { achievements: p.achievements ?? [], totals: p.totals ?? {} };
}

describe('Cosmetics — desbloqueio (P6-01-01)', () => {
  it('default sempre desbloqueado, mesmo para jogador novo', () => {
    const c = catalog();
    expect(isUnlocked(c.ships[0]!, EMPTY_PROFILE)).toBe(true);
  });

  it('achievement: depende do ID estar presente no perfil', () => {
    const ach = catalog().shotColors[1]!;
    expect(isUnlocked(ach, profile({ achievements: [] }))).toBe(false);
    expect(isUnlocked(ach, profile({ achievements: ['ach-first-boss'] }))).toBe(true);
  });

  it('totalAtLeast: avalia na borda do limiar (>=)', () => {
    const prism = catalog().ships[1]!; // exige totalGraze >= 500
    expect(isUnlocked(prism, profile({ totals: { totalGraze: 499 } }))).toBe(false);
    expect(isUnlocked(prism, profile({ totals: { totalGraze: 500 } }))).toBe(true);
    expect(isUnlocked(prism, profile({ totals: { totalGraze: 999 } }))).toBe(true);
    expect(isUnlocked(prism, EMPTY_PROFILE)).toBe(false); // total ausente = 0
  });
});

describe('Cosmetics — getLoadout com fallback (P6-01-01)', () => {
  const c = catalog();

  it('seleção válida e desbloqueada é respeitada', () => {
    const prof = profile({ totals: { totalGraze: 600 } });
    const lo = getLoadout(c, prof, { shipId: 'ship-prism' });
    expect(lo.shipId).toBe('ship-prism');
    expect(lo.shotColorId).toBe('shot-default'); // não escolhido ⇒ default
    expect(lo.musicId).toBe('music-default');
  });

  it('seleção de ID inexistente cai no default', () => {
    const lo = getLoadout(c, EMPTY_PROFILE, { shipId: 'ship-fantasma' });
    expect(lo.shipId).toBe('ship-default');
  });

  it('seleção de item bloqueado (perfil regrediu/editado) cai no default', () => {
    // perfil sem graze suficiente, mas seleção aponta para o item bloqueado
    const lo = getLoadout(c, EMPTY_PROFILE, { shipId: 'ship-prism' });
    expect(lo.shipId).toBe('ship-default');
  });

  it('jogador novo sem seleção ⇒ tudo nos defaults', () => {
    const lo = getLoadout(c, EMPTY_PROFILE, {});
    expect(lo).toEqual({ shipId: 'ship-default', shotColorId: 'shot-default', musicId: 'music-default' });
  });

  it('getDefault devolve o único default do tipo', () => {
    expect(getDefault(c, 'ship').id).toBe('ship-default');
    expect(getDefault(c, 'shotColor').id).toBe('shot-default');
    expect(getDefault(c, 'music').id).toBe('music-default');
  });
});

describe('Cosmetics — seleção (P6-01-01)', () => {
  const c = catalog();

  it('canSelect respeita existência, tipo e desbloqueio', () => {
    expect(canSelect(c, EMPTY_PROFILE, 'ship', 'ship-default')).toBe(true);
    expect(canSelect(c, EMPTY_PROFILE, 'ship', 'ship-prism')).toBe(false);
    expect(canSelect(c, profile({ totals: { totalGraze: 500 } }), 'ship', 'ship-prism')).toBe(true);
    // id existe, mas pedido no tipo errado ⇒ não selecionável
    expect(canSelect(c, EMPTY_PROFILE, 'shotColor', 'ship-default')).toBe(false);
  });

  it('selecionar válido devolve seleção atualizada; bloqueado lança', () => {
    const next = selectCosmetic(c, EMPTY_PROFILE, {}, 'shotColor', 'shot-default');
    expect(next.shotColorId).toBe('shot-default');
    expect(() => selectCosmetic(c, EMPTY_PROFILE, {}, 'ship', 'ship-prism')).toThrow();
    expect(() => selectCosmetic(c, EMPTY_PROFILE, {}, 'ship', 'ship-fantasma')).toThrow();
  });

  it('findCosmetic acha por id em qualquer tipo', () => {
    expect(findCosmetic(c, 'music-default')?.kind).toBe('music');
    expect(findCosmetic(c, 'nao-existe')).toBeUndefined();
  });
});

describe('Cosmetics — validação de integridade (P6-01-01)', () => {
  it('um catálogo bem-formado passa', () => {
    expect(() => validateCosmetics(catalog())).not.toThrow();
  });

  it('exige exatamente um default por tipo', () => {
    const c = catalog();
    // sem default nas naves
    expect(() => validateCosmetics({ ...c, ships: [c.ships[1]!] })).toThrow();
    // dois defaults nas naves
    const twoDefaults: CosmeticCatalog = {
      ...c,
      ships: [c.ships[0]!, { ...c.ships[0]!, id: 'ship-dup-default' }],
    };
    expect(() => validateCosmetics(twoDefaults)).toThrow();
  });

  it('barra id duplicado, cor inválida e shape inexistente', () => {
    const c = catalog();
    const dup: CosmeticCatalog = { ...c, ships: [c.ships[0]!, { ...c.ships[0]!, shape: 'diamond' }] };
    expect(() => validateCosmetics(dup)).toThrow(/duplicado/);

    const badColor: CosmeticCatalog = { ...c, ships: [c.ships[0]!, { ...c.ships[1]!, color: 'roxo' }] };
    expect(() => validateCosmetics(badColor)).toThrow(/cor inválida/);

    const badShape: CosmeticCatalog = { ...c, ships: [c.ships[0]!, { ...c.ships[1]!, shape: 'octogono' }] };
    expect(() => validateCosmetics(badShape)).toThrow(/shape inexistente/);
  });

  it('barra stat desconhecido em totalAtLeast', () => {
    const c = catalog();
    const bad: CosmeticCatalog = {
      ...c,
      ships: [c.ships[0]!, { ...c.ships[1]!, unlock: { type: 'totalAtLeast', stat: 'xp', value: 10 } }],
    };
    expect(() => validateCosmetics(bad)).toThrow(/stat desconhecido/);
  });

  it('validação cruzada: conquista inexistente quebra quando o registro é fornecido', () => {
    const c = catalog(); // contém unlock achievement "ach-first-boss"
    // sem registro: ignora a checagem cruzada (P6-02-01 ainda não existe)
    expect(() => validateCosmetics(c)).not.toThrow();
    // com registro que NÃO contém o id: quebra
    expect(() => validateCosmetics(c, new Set(['outra-conquista']))).toThrow(/conquista inexistente/);
    // com registro que contém o id: passa
    expect(() => validateCosmetics(c, new Set(['ach-first-boss']))).not.toThrow();
  });
});
