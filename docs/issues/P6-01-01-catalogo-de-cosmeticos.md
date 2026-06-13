# [P6-01-01] Catálogo de cosméticos + desbloqueio + seleção persistida

## Objetivo

Criar a camada de dados dos cosméticos: catálogo declarativo
(`src/data/cosmetics.json`) com naves, cores de tiro e trilhas, condições de
desbloqueio (por conquista ou estatística), e a **seleção do jogador**
persistida no perfil. Sem UI nem aplicação visual nesta issue (P6-01-02).

## Contexto

- Depende de **P6-03-01** (perfil) e **P6-02-01** (IDs de conquistas como
  condição de desbloqueio).
- Regra de ouro da visão: cosmético **nunca** afeta jogabilidade — muda só
  render/áudio. A simulação não conhece cosméticos; replay, ranking e Diário
  ficam intocados por construção.
- A nave é desenhada por formas (`ui/shapes`) com cor — trocar forma/cor é
  barato; a trilha procedural (P5-04-01) parametrizável por dados permite
  "trilhas" como presets de `audio.json`.

## Requisitos funcionais

1. Schema do cosmético: `id` estável, `kind` (`ship` | `shotColor` |
   `music`), `title`, payload visual por tipo (ship: `shape` + `color`;
   shotColor: `color`; music: referência a preset de trilha), e `unlock`:
   `default` (disponível desde o início) | `achievement` (ID da conquista) |
   `totalAtLeast` (mesmo vocabulário da P6-02-01 — reusar tipos/avaliador,
   não duplicar).
2. Catálogo inicial: ~3 naves, ~4 cores de tiro, ~2 trilhas — pelo menos um
   `default` por tipo (o visual atual vira o cosmético padrão).
3. `Cosmetics` (serviço puro): `isUnlocked(def, profile)`,
   `getLoadout(profile)` → `{ shipId, shotColorId, musicId }` com fallback
   para os defaults se a seleção for inválida/bloqueada.
4. Perfil ganha `loadout` (seleção por tipo); `SaveService` com
   getter/setter; selecionar item bloqueado é rejeitado na camada de serviço.
5. Validação de integridade: IDs únicos, cores #hex válidas, `shape`
   existente em `ui/shapes`, conquista referenciada existe em
   `achievements.json`, exatamente um `default` por tipo.

## Requisitos não funcionais

- 100% headless e testável; nenhuma mudança em `src/sim/`/`src/systems/`.
- Validação cruzada catálogo⇄conquistas roda nos testes de integridade (erro
  de referência quebra o CI, não o jogador).
- Legibilidade protegida por curadoria: cores de tiro do catálogo não podem
  se confundir com balas inimigas (decisão de conteúdo, registrada no JSON).

## Critérios de aceite

- [ ] Headless: `isUnlocked` coberto (default, por conquista presente/ausente,
      por total na borda do limiar).
- [ ] Headless: `getLoadout` com seleção válida, inválida (ID inexistente) e
      bloqueada (regrediu? perfil editado na mão) ⇒ fallback correto.
- [ ] Seleção persiste e sobrevive a recarga (store injetável).
- [ ] Integridade: catálogo inicial validado, inclusive referência cruzada a
      conquistas.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/data/cosmetics.json` (novo)
- `src/services/Cosmetics.ts` (novo — tipos + lógica pura)
- `src/content/` (carregamento/validação)
- `src/services/SaveService.ts` (campo `loadout`)
- `tests/Cosmetics.test.ts` (novo), `tests/content.test.ts` (integridade)

## Fora de escopo

- UI de seleção ("Hangar") e aplicação visual/sonora em jogo (P6-01-02).
- Cosméticos pagos (P7-02) — mas o schema não deve impedi-los (campo futuro).
- Skins de balas **inimigas** (legibilidade é sagrada; paletas são P5-05).
- Trails/efeitos de partícula como cosmético (futuro; depende da Fase 5).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (seção: cosméticos, tipos, regra de não afetar jogo).
- `docs/TECH_DECISIONS.md` (TD: cosméticos como dados + loadout no perfil;
  reuso do vocabulário de condições da P6-02-01).
- `docs/ROADMAP.md` (progresso P6-01).

## Riscos técnicos

- Duplicar o avaliador de condições (drift entre conquista e cosmético) —
  reusar os tipos/funções da P6-02-01; se precisar divergir, é sinal de
  design errado.
- Perfil com loadout apontando para cosmético removido do catálogo —
  fallback para default já coberto; nunca exceção.
- "Trilha" como cosmético antes da P5-04-01 existir — se a trilha dinâmica
  não estiver pronta, o tipo `music` entra no schema mas o catálogo inicial
  pode conter só a trilha padrão (registrar no PR).

## Sugestão de testes (escrever primeiro)

- Desbloqueio por conquista: perfil com/sem o ID ⇒ verdadeiro/falso.
- Exatamente um default por tipo é exigido pela validação (catálogo sem
  default de `ship` falha).
- Selecionar item bloqueado ⇒ rejeitado; selecionar válido ⇒ persiste;
  recarregar ⇒ mesma seleção.
- Referência cruzada: cosmético apontando para conquista inexistente falha a
  integridade.
