# [P11-08-02] Hangar repaginado — painel de preview (nave sobre pódio + orbes/rastros)

## Objetivo

Repaginar o **painel de preview** grande do Hangar com o toolkit: a **nave sobre um
pódio com glow** (sprite da Fase 12 quando existir; silhueta vetorial até lá),
**TIRO** como **orbes coloridos procedurais** e **TRILHA** como **rastros
procedurais**, dentro de um painel `ui/panel` (variante painel de preview). Mantém
o **preview honesto por tema** (`ui/hangar.hangarPreview`) **intacto** e **sem
imagens próprias** (reaproveita o sprite de gameplay). **Nada toca a simulação.**

## Contexto

- Alvo visual: `ref/v1_Hangar.png` — a nave grande sobre um pódio luminoso e um
  bloco "PREVIEW" mostrando TIRO (orbes) e TRILHA. A `HangarScene.renderPreview`
  atual já desenha um preview honesto (sprite tingido **ou** silhueta vetorial,
  conforme o tema), via `hangarPreview` (`HangarPreview`: `shipMode` `'sprite'`/
  `'vector'`, `shipSpriteKey?`, `shipShape`, `shipColor`, `shotColor`).
- **Reuso do modelo**: `hangarPreview` (puro, theme-aware) **não muda** — decide
  sprite×vetorial pela textura carregada (P10-13/TD-33). Esta issue troca só o
  **desenho** do preview (moldura `ui/panel`, pódio, glow, orbes, rastros).
- **Sem imagens próprias** (orçamento da Fase 11 ≈0): o sprite da nave vem da Fase
  12 (P12-02) e é **reaproveitado**; TIRO/TRILHA são **procedurais** (orbes/rastros
  via `Graphics`/`Rng` decorativo), não imagens.
- Depende da estrutura/ações do Hangar (P11-08-01) e do toolkit (tokens/FX/`ui/
  panel`/ícones).

## Requisitos funcionais

1. **Painel de preview** (`ui/panel`, variante painel de preview): moldura/cantos/
   glow do toolkit, contendo a composição do preview.
2. **Nave sobre pódio com glow**: desenhar a nave selecionada centralizada sobre um
   **pódio** luminoso (glow via P11-02). Usa `hangarPreview`: se `shipMode ===
   'sprite'`, desenha o `shipSpriteKey` **tingido** por `shipColor`; senão a
   **silhueta vetorial** (`shipShape`/`shipColor`) — **comportamento honesto por
   tema preservado**.
3. **TIRO = orbes coloridos procedurais**: amostra do cosmético de tiro como
   orbe(s) na `shotColor` do preview (procedural, coerente com o tiro do jogo).
4. **TRILHA = rastros procedurais**: amostra visual da trilha como rastro(s)
   animado(s) procedurais (decorativos, `Rng` semeado — sem `Math.random`).
5. **Atualização ao selecionar**: trocar de item nas fileiras (P11-08-01) atualiza
   o preview (nave/orbe/rastro) — reusar o fluxo de re-render atual.
6. **Placeholder→sprite sem código novo**: a presença da textura decide
   (`availableShipKeys`/cache), como hoje; sem sprite, cai na silhueta sem erro.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking;
  `hangarPreview` (dado/decisão) **sem mudança**.
- **Sem `Math.random`**: rastros/decoração via `Rng` semeado (regra de ouro).
- **Sem imagens próprias**: só `Graphics`/sprite reaproveitado da Fase 12.
- **Perf**: pódio/glow assados quando estáticos; rastros sem `new` por frame
  (reciclar); animação por tempo de parede.
- **Mobile-first**: preview legível em retrato; respeita safe-areas; convive com as
  fileiras de cards (P11-08-01).

## Critérios de aceite

- [ ] O Hangar mostra um painel de preview com a nave sobre pódio com glow, TIRO em
      orbes procedurais e TRILHA em rastros procedurais — fiel ao `ref/v1_Hangar.png`
      (conferência manual `npm run dev`).
- [ ] O preview honra o tema: **sprite tingido** no Polido (quando a textura existe)
      e **silhueta vetorial** no Arcade — via `hangarPreview` **inalterado**.
- [ ] Selecionar um item atualiza o preview correspondente.
- [ ] Rastros/decoração usam `Rng` (sem `Math.random`) e não alocam por frame.
- [ ] Sem assets raster próprios adicionados; sem sprite ⇒ cai na silhueta sem erro.
- [ ] Headless: `hangarPreview` permanece coberto (sem regressão); helper de rastro/
      pódio testado se for puro.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/scenes/HangarScene.ts` (`renderPreview`/`drawShip` repaginados; pódio/orbes/
  rastros)
- `src/ui/panel.ts`, `src/ui/tokens.ts`, `src/ui/fx.ts` (consumidos)
- `src/ui/hangar.ts` (`hangarPreview` consumido **sem alterar**)
- `src/ui/shapes.ts` (`shipSilhouette` reusada; orbes se virarem helper puro)
- `src/services/Rng.ts` (consumido — rastros decorativos)
- `tests/hangar.test.ts` (regressão de `hangarPreview`; teste de helper puro novo)

## Fora de escopo

- **Fileiras de cards / VOLTAR / APLICAR** — P11-08-01.
- **Produzir o sprite** da nave (Fase 12, P12-02) — aqui placeholder/silhueta +
  ponto de integração (já existente).
- Mudar a **decisão** sprite×vetorial (`hangarPreview`/TD-33) — só repaginar o
  desenho.
- Componentes do toolkit (P11-01→05) — apenas consumidos.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (Hangar: painel de preview via toolkit; `hangarPreview`
  intacto; pódio/orbes/rastros procedurais render-side).
- `docs/GAME_DESIGN.md` (nota: preview repaginado — nave sobre pódio, TIRO orbes,
  TRILHA rastros; honesto por tema, dado inalterado).
- `docs/ROADMAP.md` (progresso P11-08 — parte preview; fechar P11-08 ao concluir
  01+02).

## Riscos técnicos

- **Quebrar o preview honesto por tema** ao repaginar — manter o uso de
  `hangarPreview`/`availableShipKeys`; cobrir a regressão.
- **`Math.random` nos rastros** — usar `Rng`; ESLint barra, mas revisar.
- **Alocação por frame** (orbes/rastros) — reciclar pool; assar o pódio estático.
- **Pódio/glow pesado** — assar (P11-02); evitar FX por frame.
- **Placeholder→sprite frágil** — origem/escala de referência iguais às do sprite
  da Fase 12 (`ASSET_CONTRACT`), como já vale para o jogo.

## Sugestão de testes (escrever primeiro)

- (regressão) `hangarPreview` inalterado: `shipMode`/`shipSpriteKey`/cores por
  tema/loadout.
- (headless) helper de rastro/pódio (se puro): avanço/reciclagem determinísticos
  com `Rng`, sem `Math.random`, sem crescer indefinidamente.
- Regressão de determinismo (reexecutar): preview não muda hash/replay.
- Fidelidade visual (nave/pódio/orbes/rastros) nos dois temas: **manual**
  (checklist no PR, `TEST_STRATEGY.md`).
