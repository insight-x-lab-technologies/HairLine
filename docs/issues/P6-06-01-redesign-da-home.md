# [P6-06-01] Redesign da Home: estrutura e layout profissional

## Objetivo

Reorganizar a `MenuScene` num layout de **home profissional** — hierarquia
visual clara, agrupamento dos modos e dos atalhos de meta-jogo, espaçamento
responsivo e respeito a safe-areas — substituindo a pilha linear de textos
empilhados por `cy + N` que existe hoje. É a fundação estrutural sobre a qual as
demais issues da P6-06 (arte/hero, rodapé social, doação) se encaixam.

## Contexto

- A `MenuScene` atual (`src/scenes/MenuScene.ts`, ~263 linhas) posiciona tudo
  com offsets manuais a partir do centro (`cy - 180` … `cy + 328`), o que já
  está saturado verticalmente e some/colide em telas curtas.
- Conteúdo a manter (nada de funcionalidade se perde nesta issue): título +
  tagline, recorde, seletor de NAVE (P6-04), botões ENDLESS / ESTÁGIOS /
  DESAFIO DIÁRIO (+ dayKey) / BOSS RUSH / EVENTO SEMANAL (+ label), atalhos
  HANGAR / CONQUISTAS / ESTATÍSTICAS, apelido editável, toggle de haptics, e os
  atalhos de teclado (ENTER/SPACE iniciam Endless).
- Padrão do projeto: **lógica de layout pura e testável** em `src/ui/*` (ex.:
  `hudLayout`, `stageSelect`, `stats`), e a cena só **desenha** lendo esse
  modelo. Seguir esse padrão aqui.
- Safe-areas via `SafeArea` / `hudLayout` (mobile com notch/gestos).

## Requisitos funcionais

1. Criar um **modelo de layout puro** `src/ui/home.ts` que, dado o tamanho
   virtual e os insets de safe-area, produz as regiões/posições dos blocos da
   home: **header** (título + tagline + recorde), **bloco primário** (Endless em
   destaque), **bloco de modos** (Estágios, Diário+dayKey, Boss Rush, Evento
   Semanal+label), **bloco meta** (Hangar / Conquistas / Estatísticas), **barra
   de utilidades** (nave, apelido, haptics) e a faixa de **rodapé** reservada
   (preenchida pela P6-06-03/04). Sem Phaser nesse módulo.
2. Reescrever `MenuScene.create()` para consumir esse modelo: agrupar visualmente
   (separadores/títulos de seção discretos ou agrupamento por proximidade),
   destacar a ação primária (jogar) e tornar os demais modos claramente
   secundários, mantendo todos os handlers atuais intactos.
3. Reservar explicitamente uma **faixa de rodapé** na base (acima das safe-areas)
   para versão/copyright/ícones — nesta issue ela pode ficar vazia ou com
   placeholder; as P6-06-03/04 a preenchem.
4. Layout **responsivo**: nada deve estourar ou sobrepor em telas curtas
   (ex.: 720×1280 a proporções mais largas/baixas); usar as regiões do modelo,
   não offsets fixos frágeis.

## Requisitos não funcionais

- Determinismo do jogo intocado (a home não toca na simulação/replay/ranking).
- Lógica de posicionamento **headless e testável**; a cena permanece uma casca
  fina de desenho.
- Sem regressão de acessibilidade de toque: alvos tocáveis com área confortável
  (mobile-first, one-thumb).
- Estética neon vetorial preservada (sem assets raster nesta issue).

## Critérios de aceite

- [ ] `src/ui/home.ts` é puro, testado, e devolve regiões coerentes para
      diferentes alturas/insets (sem sobreposição entre blocos).
- [ ] Todos os modos e atalhos atuais continuam acessíveis e funcionando
      (Endless, Estágios, Diário, Boss Rush, Evento Semanal, Hangar, Conquistas,
      Estatísticas, nave, apelido, haptics, ENTER/SPACE).
- [ ] Faixa de rodapé reservada e não colidindo com os botões.
- [ ] Verificação manual (`npm run dev`): home legível e organizada em retrato.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/ui/home.ts` (novo — modelo de layout puro)
- `src/scenes/MenuScene.ts` (reescrita do `create()` consumindo o modelo)
- `src/ui/hudLayout.ts` / `src/services/SafeArea.ts` (reuso, se necessário)
- `tests/home-ui.test.ts` (novo)

## Fora de escopo

- Arte/hero/background de qualidade (P6-06-02).
- Rodapé com versão, copyright e ícones sociais (P6-06-03).
- Links de doação (P6-06-04).
- Qualquer mudança de balanceamento, modos ou regras de jogo.

## Documentação a atualizar

- `docs/ROADMAP.md` (progresso P6-06).
- `docs/ARCHITECTURE.md`, se `src/ui/home.ts` merecer menção no mapa de UI.

## Riscos técnicos

- Saturação vertical: a home já tem muitos itens; agrupar/condensar sem perder
  alvos tocáveis. Considerar seções compactas em vez de uma lista longa.
- Quebrar handlers ao reescrever a cena — migrar um a um, conferindo cada modo.
- Regressão em telas muito curtas; testar o modelo com alturas variadas.

## Sugestão de testes (escrever primeiro)

- `home.ts`: dado virtual 720×1280 sem insets ⇒ blocos em ordem vertical sem
  sobreposição e rodapé reservado na base.
- Com insets de safe-area ⇒ blocos deslocam para dentro; rodapé acima do inset.
- Altura reduzida ⇒ blocos ainda não se sobrepõem (ou compactam previsivelmente).
