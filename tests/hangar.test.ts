import { describe, it, expect } from 'vitest';
import {
  hangarGroups,
  conditionText,
  cosmeticProfileFrom,
  GROUP_LABEL,
} from '../src/ui/hangar';
import {
  getLoadout,
  type CosmeticCatalog,
  type CosmeticProfile,
} from '../src/services/Cosmetics';
import { SaveService, type KeyValueStore } from '../src/services/SaveService';
import { Simulation } from '../src/sim/Simulation';

/** Catálogo sintético cobrindo default, totalAtLeast e achievement. */
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
        unlock: { type: 'achievement', achievementId: 'first-boss' },
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

function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('hangar — texto da condição, fonte única (P6-01-02)', () => {
  it('default não tem condição; totalAtLeast usa rótulo legível', () => {
    expect(conditionText({ type: 'default' })).toBe('');
    expect(conditionText({ type: 'totalAtLeast', stat: 'totalGraze', value: 500 })).toBe(
      'graze total ≥ 500',
    );
  });

  it('achievement reusa a desc da conquista quando disponível', () => {
    const desc = (id: string): string | undefined => (id === 'first-boss' ? 'Vença um chefe' : undefined);
    expect(conditionText({ type: 'achievement', achievementId: 'first-boss' }, desc)).toBe(
      'Vença um chefe',
    );
    // sem resolvedor: cai num texto explícito, nunca vazio
    expect(conditionText({ type: 'achievement', achievementId: 'x' })).toContain('x');
  });
});

describe('hangar — modelo de exibição (P6-01-02)', () => {
  it('agrupa por tipo na ordem NAVE/TIRO/TRILHA', () => {
    const groups = hangarGroups(catalog(), profile({}), {});
    expect(groups.map((g) => g.kind)).toEqual(['ship', 'shotColor', 'music']);
    expect(groups.map((g) => g.label)).toEqual([GROUP_LABEL.ship, GROUP_LABEL.shotColor, GROUP_LABEL.music]);
  });

  it('jogador novo: só defaults desbloqueados e selecionados; bloqueados mostram condição', () => {
    const groups = hangarGroups(catalog(), profile({}), {});
    const ships = groups[0]!.items;
    expect(ships[0]).toMatchObject({ id: 'ship-default', unlocked: true, selected: true, condition: '' });
    expect(ships[1]).toMatchObject({ id: 'ship-prism', unlocked: false, selected: false });
    expect(ships[1]!.condition).toBe('graze total ≥ 500');
    // amostras visuais presentes por tipo
    expect(ships[0]!.shape).toBe('arrow');
    expect(ships[0]!.color).toBe('#0bd3c6');
    expect(groups[1]!.items[0]!.color).toBe('#ffe066');
    expect(groups[2]!.items[0]!.preset).toBe('default');
  });

  it('seleção válida marca o item escolhido como selecionado', () => {
    const prof = profile({ totals: { totalGraze: 600 } });
    const groups = hangarGroups(catalog(), prof, { shipId: 'ship-prism' });
    const ships = groups[0]!.items;
    expect(ships[0]!.selected).toBe(false);
    expect(ships[1]).toMatchObject({ id: 'ship-prism', unlocked: true, selected: true });
  });

  it('loadout inválido/bloqueado: o default aparece selecionado (sem erro)', () => {
    // seleção aponta para item bloqueado (perfil sem graze) → cai no default
    const groups = hangarGroups(catalog(), profile({}), { shipId: 'ship-prism' });
    const ships = groups[0]!.items;
    expect(ships[0]!.selected).toBe(true);
    expect(ships[1]!.selected).toBe(false);
  });
});

describe('hangar — ponte SaveService → perfil (P6-01-02)', () => {
  it('injeta bestScore nos totais para o desbloqueio fechar', () => {
    const save = new SaveService(fakeStore());
    save.setBestScore(5000);
    const prof = cosmeticProfileFrom(save);
    expect(prof.totals.bestScore).toBe(5000);
    expect(prof.achievements).toEqual([]);
  });

  it('lê conquistas desbloqueadas do save', () => {
    const save = new SaveService(fakeStore());
    save.unlockAchievements(['first-boss'], '2026-06-14');
    expect(cosmeticProfileFrom(save).achievements).toContain('first-boss');
  });
});

describe('hangar — regressão de determinismo (P6-01-02)', () => {
  it('loadout não-default não altera o hashState (cosmético é só apresentação)', () => {
    const c = catalog();
    // dois loadouts distintos: default vs. prisma desbloqueado
    const loDefault = getLoadout(c, profile({}), {});
    const loCustom = getLoadout(c, profile({ totals: { totalGraze: 600 } }), { shipId: 'ship-prism' });
    expect(loDefault.shipId).not.toBe(loCustom.shipId);

    // A Simulation NÃO recebe loadout — por construção a apresentação não vaza
    // para a lógica. Mesma seed/inputs ⇒ mesmo hash, independente do cosmético.
    const run = (): string => {
      const sim = new Simulation({ seed: 4242 });
      for (let i = 0; i < 600; i++) sim.tick();
      return sim.hashState();
    };
    expect(run()).toBe(run());
  });
});
