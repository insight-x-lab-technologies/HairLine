# [P11-06-02] Home — centerpiece de nave-herói: slot + anel de graze + rastros + callouts GRAZE/PODER

## Objetivo

Adicionar à Home repaginada o **centerpiece visual** do herói: um **slot de
nave-herói** (placeholder até o sprite da Fase 12), envolto por um **anel de
graze** e **rastros procedurais**, com **callouts GRAZE e PODER** apontando a
mecânica central — exatamente o foco visual do `ref/v1_MenuPrincipal.png`. É
decorativo/composição; **nada toca a simulação.**

## Contexto

- Depende da estrutura da Home (P11-06-01) e do toolkit (tokens/FX/ícones). Esta
  issue cuida **só** do bloco do herói, que P11-06-01 reservou no header.
- A peça comunica o **wedge** do jogo (graze → poder): o mockup mostra a nave no
  centro com um anel de graze e os rótulos **GRAZE** ("voar perto carrega") e
  **PODER** ("solte o pulso"). É vitrine, não gameplay.
- **Reuso de arte**: o sprite da nave vem da **Fase 12** (P12-02) e é reaproveitado
  aqui, no Hangar (P11-08) e no gameplay. Até existir, usar **placeholder** — a
  silhueta vetorial (`ui/shapes.shipSilhouette`, já usada no jogo/Hangar) é o
  fallback natural, coerente com o tema Arcade.
- **Rastros/anel são procedurais e decorativos** (render-side), no espírito de
  `ui/heroBackground`: usam `Rng` decorativo (sem `Math.random`), sem afetar a sim.

## Requisitos funcionais

1. **Slot de nave-herói** centralizado no header da Home: desenha o **placeholder**
   (silhueta `shipSilhouette` tingida pelos tokens) num ponto/escala definidos pelo
   layout (`ui/home`). Estruturar para **trocar pelo sprite** da Fase 12 sem
   reescrever (mesma origem/escala de referência; se o sprite estiver carregado,
   usa-o; senão, silhueta).
2. **Anel de graze** ao redor da nave: anel neon coerente com o anel de graze do
   jogo (estética), pulsando suavemente. Decorativo (não é o anel da sim).
3. **Rastros procedurais**: partículas/linhas de "rastro" animadas ao redor/atrás
   da nave, derivadas de `Rng` decorativo (determinístico, sem `Math.random`), sem
   alocação por frame (reciclar, como `ui/heroBackground`/fundo procedural).
4. **Callouts GRAZE e PODER**: dois rótulos posicionados (esquerda/direita do
   herói, conforme o mockup) com texto curto, usando a tipografia/tokens; posições
   vindas do modelo puro (`ui/home`).
5. **Integração não destrutiva**: o centerpiece convive com os cards/botões de
   P11-06-01 sem empurrá-los para fora das safe-areas; em telas curtas, degrada com
   elegância (rastros mais discretos / callouts menores) sem quebrar o layout.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking.
- **Sem `Math.random`**: aleatoriedade decorativa só via `Rng` semeado (regra de
  ouro do projeto; ESLint barra `Math.random`).
- **Perf**: sem `new` por frame (reciclar rastros/partículas); animação por tempo
  de parede (render), nunca por tick lógico.
- **Responsivo/mobile-first**: posições/escala derivadas do layout puro; respeita
  safe-areas; não compete com os cards (legibilidade).
- **Troca de placeholder→sprite sem código novo de gameplay**: só presença/ausência
  de textura decide (como o fluxo de sprite do tema Polido).

## Critérios de aceite

- [ ] A Home mostra o slot de nave-herói (placeholder silhueta) com **anel de
      graze** pulsante e **rastros procedurais** animados, fiel ao
      `ref/v1_MenuPrincipal.png` (conferência manual `npm run dev`).
- [ ] **Callouts GRAZE e PODER** posicionados pelo modelo puro, legíveis.
- [ ] Rastros/anel usam **`Rng` decorativo** (sem `Math.random`) e **não alocam por
      frame**.
- [ ] Estruturado para usar o **sprite da Fase 12** quando existir, caindo na
      silhueta sem ele (sem erro).
- [ ] Não empurra os cards/rodapé para fora das safe-areas; degrada bem em telas
      curtas.
- [ ] Headless: posições do slot/anel/callouts no modelo puro testadas.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/home.ts` (posições do slot/anel/callouts — puro)
- `src/scenes/MenuScene.ts` (desenhar o centerpiece)
- `src/ui/heroBackground.ts` ou novo helper de rastros (procedural decorativo, no
  mesmo espírito)
- `src/ui/shapes.ts` (`shipSilhouette` reusada como placeholder)
- `src/services/Rng.ts` (consumido — decorativo)
- `tests/home-ui.test.ts` (estender) / teste do helper de rastros se puro

## Fora de escopo

- **Estrutura da Home** (cards/botão/meta/rodapé) — P11-06-01.
- **Painel de settings** — P11-06-03.
- **Produzir o sprite** da nave-herói — Fase 12 (P12-02); aqui só placeholder +
  ponto de integração.
- Reusar o centerpiece no Hangar (P11-08) — lá será o painel de preview próprio.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (Home: centerpiece de nave + callouts GRAZE/PODER como
  vitrine do wedge).
- `docs/ARCHITECTURE.md` (rastros/anel decorativos render-side via `Rng`, como o
  fundo procedural; slot de nave placeholder→sprite).
- `docs/ROADMAP.md` (progresso P11-06 — parte hero-nave).

## Riscos técnicos

- **`Math.random` acidental** nos rastros — usar `Rng`; ESLint barra, mas revisar.
- **Alocação por frame** (partículas novas a cada frame) — reciclar pool, como o
  fundo procedural.
- **Competir com os cards/legibilidade** — manter contraste/escala contidos; o
  centerpiece é fundo de header, não disputa com o conteúdo.
- **Placeholder→sprite frágil** — fixar origem/escala de referência iguais aos do
  sprite da Fase 12 (`ASSET_CONTRACT`) para a troca ser só de textura.
- **Telas curtas** — degradar rastros/callouts sem quebrar o header.

## Sugestão de testes (escrever primeiro)

- (headless) modelo puro: posições do slot, raio do anel e âncoras dos callouts
  para um campo `w×h` + safe-areas.
- (headless) helper de rastros (se puro): avanço/reciclagem determinísticos com
  `Rng` semeado, sem `Math.random`, sem crescer indefinidamente.
- Regressão de determinismo (reexecutar): centerpiece não muda hash/replay.
- Fidelidade visual/animação e degradação em telas curtas: **manual** (checklist no
  PR, `TEST_STRATEGY.md`).
