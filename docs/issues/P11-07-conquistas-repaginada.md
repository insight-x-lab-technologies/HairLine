# [P11-07] Conquistas repaginada — lista de cards com o toolkit

## Objetivo

Repaginar a tela de Conquistas (`AchievementsScene`) aplicando o toolkit da Fase
11: uma **lista vertical de cards** (`ui/panel`) com badge **★** (desbloqueada, com
data) / **🔒** (travada, com a condição), título + subtítulo e **realce das
desbloqueadas**; **header** + **pílula "X/Y"** e **botão VOLTAR** (`ui/button`).
Reusa o modelo de dados puro `ui/achievements` **intacto**. É o **menor item da
fase** e o **primeiro teste real do toolkit** numa tela inteira. **Nada toca a
simulação.**

## Contexto

- Alvo visual: `ref/v1_Conquistas.png` (lista de cards com badges, contador "2/10"
  no topo, VOLTAR embaixo). A tela atual (`ref/v0_Conquistas.jpeg`) é uma lista de
  `neonText` soltos — `AchievementsScene` (51 linhas) só desenha o modelo já
  pronto.
- **Reuso ~100%**: o dado já existe e **não muda**. `ui/achievements.galleryModel`
  devolve `GalleryRow` (`id`, `title`, `desc`, `unlocked`, `dateIso?`) e o
  `GalleryModel` (`unlockedCount`, `total`). A `desc` é a **fonte única** do texto
  da condição. Esta issue troca só o **desenho**.
- O toolkit já existe: tokens (P11-01-01), tipografia (P11-01-02), FX (P11-02),
  `ui/panel` (P11-03), `ui/button` (P11-04), ícones (P11-05). A linha vertical é
  exatamente a **variante "linha vertical"** do `ui/panel` e os badges ★/🔒 são
  chaves de ícone de P11-05.
- Como os cards são **mais altos** que as linhas de texto atuais e há ~10+
  conquistas, a lista provavelmente **não cabe** numa tela retrato — precisa de
  **rolagem/overflow** (ou paginação). Decisão da SDD.

## Requisitos funcionais

1. **Lista vertical de cards** via `ui/panel` (variante linha vertical), uma por
   `GalleryRow` na ordem do modelo: badge **★** (desbloqueada) com a **data** /
   **🔒** (travada) com a **condição** (`desc`), **título** + **subtítulo**.
2. **Realce das desbloqueadas**: estado visual distinto (cor/realce primária) vs.
   travadas (esmaecido) — mapeando `row.unlocked` para o estado do card.
3. **Header** "CONQUISTAS" (tipografia display) + **pílula "X/Y"**
   (`unlockedCount/total`) com o acabamento do toolkit.
4. **Botão VOLTAR** (`ui/button`, estilo secundário, ícone de P11-05) → `SceneKeys.
   Menu`; manter o atalho **ESC** existente.
5. **Rolagem/overflow**: se a lista exceder a altura útil, permitir percorrer
   (scroll por arraste/roda ou paginação), respeitando safe-areas. Manter o header
   e o VOLTAR sempre acessíveis.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking; o
  `ui/achievements` (dado) e o `SaveService` (perfil) **não mudam**.
- **Perf**: cards estáticos assados (P11-02/03); zero alocação por frame; rolagem
  fluida (reusar/reposicionar, não recriar cards por frame).
- **Mobile-first**: alvos de toque confortáveis, legível em retrato, respeita
  safe-areas (`hudLayout`).
- **Consistência**: cores/raios/espaçamentos só dos tokens; mesma linguagem de card
  das outras telas (é o primeiro teste dessa consistência).

## Critérios de aceite

- [ ] Conquistas mostra uma lista de cards (★ com data / 🔒 com condição, título +
      subtítulo, desbloqueadas em realce), header + pílula "X/Y" e botão VOLTAR —
      fiel ao `ref/v1_Conquistas.png` (conferência manual `npm run dev`).
- [ ] O dado vem de `galleryModel` **sem alteração**; a `desc` continua sendo a
      fonte do texto da condição.
- [ ] A lista permite ver **todas** as conquistas (rolagem/paginação) sem cortar o
      header/VOLTAR; ESC e o botão voltam ao Menu.
- [ ] Headless: se algum helper de layout/rolagem for puro, é testado; o modelo
      `ui/achievements` permanece coberto (sem regressão).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/scenes/AchievementsScene.ts` (desenhar via `ui/panel`/`ui/button`/ícones;
  rolagem)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`,
  `src/ui/fx.ts` (consumidos)
- `src/ui/achievements.ts` (consumido **sem alterar** o dado; só se precisar de um
  helper de layout/rolagem puro)
- `tests/achievements-ui.test.ts` (estender se houver layout puro novo)

## Fora de escopo

- **Mudar o dado/lógica** de conquistas (P6-02) — só repaginar a exibição.
- **Toasts de fim de run** (na `ResultsScene`) — a repaginação de Results é P11-09.
- Componentes do toolkit em si (P11-01→05) — apenas consumidos.
- Novas conquistas ou mudança de condições.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (Conquistas: `AchievementsScene` desenha via toolkit;
  dado `ui/achievements` intacto).
- `docs/GAME_DESIGN.md` (nota curta: galeria repaginada com cards — visual, dado
  inalterado).
- `docs/ROADMAP.md` (progresso P11-07).
- `docs/TECH_DECISIONS.md`: **não** abrir TD (consome a virada já registrada em
  P11-06-01).

## Riscos técnicos

- **Lista não cabe na tela** (cards altos × ~10+ conquistas) — implementar rolagem/
  paginação; mascarar overflow respeitando safe-areas. É o risco principal.
- **Perf de rolagem** com glow por card — assar cards estáticos (P11-02) e
  reposicionar (não recriar) ao rolar.
- **Regressão do dado** — não tocar `galleryModel`/`SaveService`; conferir contador
  e textos de condição.
- **Primeiro uso real do toolkit** pode revelar lacunas na API de `ui/panel` —
  ajustar o componente se necessário (mas sem virar redesign do componente aqui).

## Sugestão de testes (escrever primeiro)

- (headless) se houver layout/rolagem puro: posições das linhas, faixa visível,
  clamp do scroll.
- (regressão) `galleryModel` inalterado: linhas, contador, `desc` como condição.
- Regressão de determinismo (reexecutar): tela não muda hash/replay.
- Fidelidade ao mockup, rolagem e voltar (botão + ESC): **manual** (checklist no
  PR, `TEST_STRATEGY.md`).
