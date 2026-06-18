# [P11-03] `ui/panel` — componente de card (modelo puro + desenho no Phaser)

## Objetivo

Entregar o **componente de card** do toolkit de UI da Fase 11: um **modelo de
layout PURO** (`ui/panel`, testável headless) + a função de **desenho no Phaser**
que o materializa — retângulo de cantos arredondados, fill em gradiente, borda
neon, glow, badge de ícone opcional, título, subtítulo, chevron opcional e os
**estados** normal / selecionado / travado / destaque. As **variantes** cobrem
todas as telas da fase (card de modo da Home, linha de Conquistas, card do Hangar,
painel de preview). É o tijolo central da tese de **reuso** da Fase 11. **Nada
toca a simulação.**

## Contexto

- A Fase 11 fica **no Phaser 4.1** (sem DOM/CSS); cards são desenhados
  proceduralmente (`Graphics.fillRoundedRect`/`fillGradientStyle`, glow via o
  helper de FX). Os mockups conceituais confirmam **a mesma linguagem de card** nas
  três telas: `ref/v1_MenuPrincipal.png` (5 cards de modo, Diário em **dourado**),
  `ref/v1_Conquistas.png` (linhas verticais com badge ★/🔒) e `ref/v1_Hangar.png`
  (cards pequenos NAVE/TIRO/TRILHA + painel de preview grande).
- **Reuso é a tese**: o mesmo vocabulário de card serve Home, Conquistas, Hangar,
  Stats e Results. Construir o componente **agora** e aplicá-lo nas telas depois
  (P11-06+). Esta issue entrega **o componente**, não a aplicação às cenas.
- Espírito de implementação igual a `ui/home`/`ui/hangar`/`ui/achievements`:
  **modelo puro/headless** (posições, caixas, estado resolvido) que a cena só
  **desenha**. Os modelos de dados dessas telas já existem e **alimentarão** os
  cards:
  - Home: `ui/home` (âncoras dos modos) → card de modo grande.
  - Conquistas: `ui/achievements` (`GalleryRow`: title/desc/unlocked/dateIso) →
    linha vertical.
  - Hangar: `ui/hangar` (`HangarItem`: title/unlocked/selected/condition/color/
    shape) → card horizontal + painel de preview.
- **Depende de P11-01-01** (tokens: paleta por papel/estado, raios, espaçamentos,
  bordas, presets de glow) e **P11-02** (helper de FX: glow/sombra com fallback e
  caminho estático/assado). O card consome tokens e desenha o glow pelo helper.

## Requisitos funcionais

1. **Modelo de layout PURO** (`src/ui/panel.ts`): dada uma **spec** do card
   (caixa `x/y/w/h`, variante, presença de badge/chevron/subtítulo, estado) +
   tokens, calcula as **posições internas** (retângulo, badge à esquerda, título,
   subtítulo, chevron à direita, marca de ✓/🔒) — sem Phaser, testável.
2. **Estados** (resolvidos no modelo + refletidos no desenho):
   - **normal**: borda/fill/texto padrão.
   - **selecionado**: realce ciano (borda/glow primária) + marca **✓**.
   - **travado**: **🔒** + texto da **condição**, conteúdo **esmaecido** (cores
     "disabled"/esmaecido dos tokens).
   - **destaque**: **dourado** (borda/glow de destaque) — usado p/ o **Diário** na
     Home.
3. **Anatomia** desenhada: cantos arredondados (`fillRoundedRect`), **fill em
   gradiente** (`fillGradientStyle`), **borda neon**, **glow** (via P11-02),
   **badge de ícone à esquerda** (opcional; o ícone em si vem de P11-05 — aqui o
   **slot/posição** do badge), **título**, **subtítulo** (opcional), **chevron à
   direita** (opcional).
4. **Variantes** que cobrem as telas (mesmo modelo, parâmetros diferentes):
   - **card de modo grande** (Home) — horizontal, badge + título + subtítulo +
     chevron;
   - **linha vertical** (Conquistas) — badge ★/🔒 + título + subtítulo, realce p/
     desbloqueada;
   - **card horizontal pequeno** (Hangar) — título + amostra + estado
     selecionado/travado;
   - **painel de preview** (Hangar) — moldura grande sem chevron, conteúdo
     desenhado pelo chamador.
5. **Assar quando estático**: quando o card não muda por frame, oferecer caminho
   para desenhá-lo uma vez (em `RenderTexture` ou objeto estático) reusando o
   caminho estático do helper de FX (P11-02) — **nunca** redesenhar por frame.
6. **API tipada e enxuta**: a função de desenho recebe `scene`, a **spec**
   (incl. textos/estado) e devolve o(s) GameObject(s)/container, sem expor
   primitivas de `Graphics` ao chamador. Documentar como `ui/home`/`ui/hangar`/
   `ui/achievements` mapeiam para a spec (sem **alterar** esses módulos aqui além
   do necessário para a prova de uso).

## Requisitos não funcionais

- **Modelo puro/headless**: `ui/panel` sem Phaser, sem DOM, sem `Math.random`,
  sem estado mutável global. Não importável pela sim.
- **Determinismo/replay/`hashState()`/ranking intactos** (presentation-only).
- **Perf**: cards estáticos assados; zero alocação por frame no caminho estático;
  reusar o caminho assado de P11-02 para o glow.
- **Mobile-first**: alvos de toque adequados, legível em retrato, respeita
  safe-areas (as telas usam `hudLayout`; o card recebe sua caixa já resolvida).
- **Consistência**: todas as variantes derivam **dos mesmos tokens** — nada de
  cor/raio/espaçamento mágico no `panel`.

## Critérios de aceite

- [ ] Existe `ui/panel` puro que, dada uma spec + tokens, resolve as posições
      internas (retângulo, badge, título, subtítulo, chevron, ✓/🔒) por variante.
- [ ] A função de desenho materializa o card no Phaser com cantos arredondados,
      fill em gradiente, borda neon e glow (via P11-02), nos **4 estados**
      (normal/selecionado/travado/destaque).
- [ ] As **4 variantes** existem e são parametrizações do mesmo modelo (modo
      grande / linha vertical / card pequeno / painel de preview).
- [ ] Caminho "assar/estático" disponível; nenhum redesenho por frame introduzido.
- [ ] Prova de uso real: **uma** tela/trecho desenha um card via `ui/panel`
      (ex.: uma linha de Conquistas ou um card de modo da Home), fiel ao mockup
      correspondente (conferência manual `npm run dev`) — sem mudar a lógica da
      cena.
- [ ] Headless: o modelo de layout é coberto por teste (posições por variante,
      presença condicional de badge/chevron/subtítulo, estado → marca ✓/🔒 e
      papel de cor).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/panel.ts` (novo — modelo puro de layout do card + variantes)
- desenho do card (função no próprio `ui/panel` ou módulo Phaser auxiliar, no
  padrão "modelo puro + cena desenha")
- `src/ui/tokens.ts` (consumido — P11-01-01) e `src/ui/fx.ts` (consumido — P11-02)
- **uma** cena/módulo de prova (ex.: `AchievementsScene` **ou** `MenuScene`) — só
  o trecho que prova o card, sem repaginar a tela inteira (isso é P11-06+)
- `tests/panel.test.ts` (novo)

## Fora de escopo

- **Repaginar as telas** (Home/Conquistas/Hangar/Stats/Results) — P11-06 a P11-09;
  aqui só o componente + 1 prova de uso.
- **`ui/button`** (P11-04) — botão é outro componente; o chevron do card não é um
  botão.
- **Iconografia** (P11-05) — o card só reserva o **slot** do badge; os glifos/
  ícones vêm depois (usar placeholder de texto/símbolo até lá).
- Definir **tokens** (P11-01-01) e o **helper de FX** (P11-02) — apenas consumidos.
- Barra de moeda/gemas, rank/nível e contadores de economia dos mockups (features
  ignoradas por decisão da Fase 11).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/`: `panel` como componente de card do toolkit —
  modelo puro + desenho, variantes, consome tokens/FX, assado quando estático).
- `docs/ROADMAP.md` (progresso P11-03).
- `docs/TECH_DECISIONS.md`: **não** abrir TD próprio (segue a virada já prevista
  para o TD da Fase 11 em P11-06); registrar só se a API do componente trouxer
  decisão estrutural inesperada.
- `docs/TEST_STRATEGY.md` (checklist manual de fidelidade do card aos mockups).

## Riscos técnicos

- **`fillGradientStyle` no Phaser 4.1**: comportamento/assinatura podem diferir do
  esperado (Phaser 4 ≠ 3) — validar no build; ter fill sólido como fallback se o
  gradiente divergir.
- **Explosão de variantes**: tentar um componente "faz-tudo" com flags demais —
  manter um modelo enxuto com poucas variantes nomeadas; ampliar sob demanda das
  telas reais.
- **Perf de glow/gradiente por card**: muitos cards com FX por frame pesam —
  forçar caminho assado/estático (P11-02) e cards estáticos.
- **Acoplar o `panel` a um modelo de tela específico** — manter a spec **genérica**
  (caixa + textos + estado); o mapeamento de `ui/home`/`ui/hangar`/`ui/achievements`
  → spec fica no chamador.
- **Slot de badge sem ícone ainda** (P11-05) — usar placeholder e garantir que a
  ausência de ícone não quebre o layout.
- **Token/posição vazar para a sim** — barrar por revisão; `ui/panel` é
  presentation-only.

## Sugestão de testes (escrever primeiro)

- (headless) modelo de layout por variante: caixa → posições de retângulo/badge/
  título/subtítulo/chevron coerentes; badge/chevron/subtítulo aparecem só quando
  pedidos.
- (headless) estado → resolução: selecionado ⇒ marca ✓ + papel de cor primária;
  travado ⇒ 🔒 + condição + cor esmaecida; destaque ⇒ cor de destaque (dourado).
- (headless) mapeamento de exemplo: um `GalleryRow`/`HangarItem`/âncora de modo
  vira a spec esperada.
- Regressão de determinismo (reexecutar): card não muda hash/replay.
- Fidelidade visual ao mockup e perf: **manual** (checklist no PR,
  `TEST_STRATEGY.md`).
