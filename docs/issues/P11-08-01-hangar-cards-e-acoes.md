# [P11-08-01] Hangar repaginado — fileiras de cards (NAVE/TIRO/TRILHA) + VOLTAR/APLICAR

## Objetivo

Repaginar a **parte interativa** do Hangar (`HangarScene`) com o toolkit da Fase
11: as seções **NAVE / TIRO / TRILHA** como **fileiras horizontais de cards**
(`ui/panel`) com estados **selecionado** (✓) / **travado** (🔒 + condição), e os
**botões VOLTAR / APLICAR** (`ui/button`). Reusa o modelo puro `ui/hangar`
**intacto** e preserva a seleção/persistência e o preview de trilha. O **painel de
preview** grande é a **P11-08-02**. **Nada toca a simulação.**

## Contexto

- Alvo visual: `ref/v1_Hangar.png` (três fileiras de cards rotuladas NAVE/TIRO/
  TRILHA, selecionado em ciano + ✓, travado com 🔒 + condição; VOLTAR/APLICAR
  embaixo). A tela atual (`ref/v0_Hangar.jpeg`) desenha itens como `neonText`/
  swatches soltos.
- **Reuso ~alto**: o dado já existe e **não muda**. `ui/hangar.hangarGroups`
  devolve `HangarGroup`/`HangarItem` (`title`, `unlocked`, `selected`,
  `condition`, `color?`, `shape?`, `preset?`), `conditionText` é a fonte do texto
  da condição, e `selectCosmetic` (serviço `Cosmetics`) valida/rejeita item
  bloqueado. Esta issue troca só o **desenho** das fileiras e os botões.
- Toolkit pronto: tokens (P11-01-01), tipografia (P11-01-02), FX (P11-02),
  `ui/panel` (P11-03, variante **card horizontal pequeno**), `ui/button` (P11-04),
  ícones (P11-05).
- **Comportamento atual a preservar** (`HangarScene.select`): tocar um item
  desbloqueado seleciona/persiste (`selectCosmetic` + `getLoadoutSelection`),
  item travado é rejeitado na camada de serviço, e tocar uma **trilha** toca uma
  amostra (`getAudio().previewMusic(preset)`), parada no `shutdown`.
- **Decisão p/ a SDD — momento de aplicar**: hoje a seleção **persiste no toque**.
  O mockup tem **APLICAR**. Definir: (a) manter persistência **imediata** no toque
  e usar APLICAR como "confirmar e voltar"; **ou** (b) seleção **encenada**
  (pending) que só persiste no APLICAR. Recomendação: **(a)** (menor mudança,
  preserva persistência e o preview honesto por toque) — registrar a escolha.

## Requisitos funcionais

1. **Três fileiras horizontais de cards** (NAVE/TIRO/TRILHA), uma por
   `HangarGroup`, cada item um card `ui/panel` (variante card horizontal pequeno)
   com **título**, **amostra** (cor da nave/tiro; ícone de nota/trilha — chave de
   P11-05) e **estado**: selecionado (realce ciano + **✓**) / travado (**🔒** +
   **condição**) / disponível.
2. **Cabeçalhos de seção** (NAVE/TIRO/TRILHA — `GROUP_LABEL`) com a tipografia/
   tokens.
3. **Seleção**: tocar item desbloqueado seleciona via `selectCosmetic` (mantendo a
   validação/rejeição de item travado); refletir o novo estado nos cards.
4. **Preview de trilha**: tocar uma trilha toca a amostra (`previewMusic`),
   respeitando o mudo e parando no `shutdown` (comportamento atual).
5. **Botões VOLTAR / APLICAR** (`ui/button`): VOLTAR (secundário) → `SceneKeys.Menu`
   (mantém ESC); APLICAR (primário) conforme a decisão do momento de aplicar.
6. **Layout horizontal rolável** se uma fileira exceder a largura (ex.: TIRO com
   muitas cores), respeitando safe-areas.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking. Cosmético
  **nunca** muda jogabilidade; `ui/hangar`/`Cosmetics`/`SaveService` **sem mudança
  de formato**.
- **Perf**: cards estáticos assados (P11-02/03); zero alocação por frame.
- **Mobile-first**: alvos de toque confortáveis, legível em retrato, safe-areas.
- **Sem regressão**: seleção, persistência (`getLoadoutSelection`), rejeição de
  travado e preview de trilha continuam idênticos.

## Critérios de aceite

- [ ] Hangar mostra NAVE/TIRO/TRILHA como fileiras de cards com selecionado (✓) /
      travado (🔒 + condição), e botões VOLTAR/APLICAR — fiel ao `ref/v1_Hangar.png`
      (conferência manual `npm run dev`).
- [ ] Selecionar persiste como hoje; item travado é rejeitado; trilha toca amostra
      (respeita mudo, para no `shutdown`).
- [ ] A decisão sobre **APLICAR** (imediato × encenado) está registrada e
      funcionando, sem perder persistência.
- [ ] VOLTAR e ESC retornam ao Menu.
- [ ] `ui/hangar`/`Cosmetics`/`SaveService` sem mudança de formato (regressão
      verde).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/scenes/HangarScene.ts` (fileiras de cards + botões; preservar select/preview)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`,
  `src/ui/fx.ts` (consumidos)
- `src/ui/hangar.ts` (consumido **sem alterar** o dado; só helper de layout puro se
  necessário)
- `tests/hangar.test.ts` (estender se houver layout puro novo; regressão de
  seleção/persistência)

## Fora de escopo

- **Painel de preview** grande (nave sobre pódio + orbes/rastros) — **P11-08-02**.
- **Mudar cosméticos/regras de desbloqueio** (P6-01) — só repaginar.
- Sprite real da nave (Fase 12) — o card de NAVE usa amostra/silhueta como hoje.
- Componentes do toolkit (P11-01→05) — apenas consumidos.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (Hangar: `HangarScene` desenha as fileiras via toolkit;
  `ui/hangar`/`Cosmetics` intactos).
- `docs/GAME_DESIGN.md` (nota: Hangar repaginado — fileiras de cards; dado/seleção
  inalterados).
- `docs/ROADMAP.md` (progresso P11-08 — parte cards/ações).
- `docs/TECH_DECISIONS.md`: **não** abrir TD (consome a virada de P11-06-01);
  registrar só a decisão do APLICAR como nota, se relevante.

## Riscos técnicos

- **Mudar o momento de aplicar** sem querer (imediato → encenado) pode regredir a
  persistência/preview honesto — decidir explicitamente e cobrir por teste.
- **Fileira não cabe na largura** (muitas cores de TIRO) — rolagem horizontal,
  respeitando safe-areas.
- **Regressão de seleção/rejeição/preview** — reusar `selectCosmetic`/`previewMusic`;
  não tocar `ui/hangar`/`Cosmetics`.
- **Perf de glow por card** — assar cards estáticos (P11-02).

## Sugestão de testes (escrever primeiro)

- (headless) se houver layout puro: posições das fileiras/cards, faixa visível,
  clamp da rolagem horizontal.
- (regressão) `hangarGroups`/`selectCosmetic`/persistência inalterados; travado
  rejeitado.
- Regressão de determinismo (reexecutar): Hangar não muda hash/replay.
- Fidelidade ao mockup, seleção, preview de trilha, VOLTAR/APLICAR: **manual**
  (checklist no PR, `TEST_STRATEGY.md`).
