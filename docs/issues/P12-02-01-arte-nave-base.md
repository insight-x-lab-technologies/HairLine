# [P12-02-01] Arte definitiva da nave base — `spr-ship` (drop-in, tingível)

## Objetivo

Produzir a **arte ilustrada definitiva da nave base** (`spr-ship`) no nível de
acabamento do mockup v1 (`ref/v1_GamePlay1.png` / `ref/v1_Hangar.png`),
substituindo o placeholder atual **no mesmo slot** (`public/sprites/ship.png`).
É um caça **branco/grayscale tingível**, nariz para cima, footprint 64px, **sem
chama/anel/hitbox/glow** (esses são desenhados em vetorial por cima — engine flame
+ bloom de P12-01). Reusada em 3 lugares (gameplay, Hangar, hero da Home) a partir
de **uma só arte**. **A integração já existe (P10-10) — esta issue é arte +
conferência, sem código novo de gameplay.**

## Contexto

- O tema "Polido" **já está cabeado** (`src/config/themes.ts` registra
  `spr-ship` → `sprites/ship.png`) e a nave sprite **já é desenhada em jogo**
  (P10-10: `SpriteTheme` herda o `VectorTheme`, mesmo container, `shipVisual` para
  Foco/i-frames/chama). O `ship.png` atual é um **placeholder cru** (silhueta cinza
  chapada, baixo detalhe). Esta issue troca **só o arquivo** por arte definitiva —
  o slot, o fallback e o feel já existem (ver `docs/ASSET_CONTRACT.md`).
- A Fase 12 é **produção de arte + tuning de FX, não código novo de gameplay**
  (ROADMAP). A nave é a peça-âncora: **1 arte, 3 usos** — gameplay, **preview do
  Hangar** (P11-08-02) e **hero da Home** (P11-06-02). As duas últimas são da Fase
  11 e dependem desta arte (hoje usam placeholder até a arte chegar).
- **Regra de cor (TD-33 / `THEME_ASSET_GUIDE §3, §4.2`):** a nave é tingida em
  runtime pela cor do cosmético (`setTint`). Por isso **autorar em branco/grayscale
  claro sobre transparência** — qualquer matiz embutido brigaria com o tint. No v1
  o brilho azul vem do **glow/chama** (vetorial + bloom de P12-01), **não** da arte.
- **O que NÃO desenhar** (`§3`): chama do motor (triângulo vetorial atrás do
  casco), ponto de hitbox, anel de graze, glow. Só o **casco/silhueta**.
- **Disciplina de footprint (jogabilidade):** todas as naves têm o mesmo tamanho
  visual; nave maior **não** é hitbox maior. Manter a massa legível dentro da caixa
  de 64px. Referência de proporção: a silhueta vetorial `shipSilhouette`
  (`src/ui/shapes.ts`) — garante "nave em jogo == nave do preview".

## Requisitos funcionais

1. **Produzir `spr-ship`** (IA ou humano) conforme `THEME_ASSET_GUIDE §4.2/§10`:
   caça top-down, **nariz para cima (−Y)**, simétrico, casco coeso (nariz/ombros/
   asas/pods), **branco/grayscale claro sobre transparência**, autorar em alta
   resolução (256×256) para escalar nítido ao footprint de 64px.
2. **Drop-in no slot existente**: salvar como `public/sprites/ship.png` (mesma
   chave `spr-ship`, mesmo path do manifesto) — **sem mudar `themes.ts` nem
   código**. PNG com alpha (ou SVG dimensionado).
3. **Tingibilidade comprovada**: a arte tinge limpo na cor default (ciano) e nas
   cores de cosmético — sem matiz embutido que "suje" o tint.
4. **Sem elementos proibidos**: a arte **não** contém chama, glow, anel de graze
   nem ponto de hitbox (conferir que não "dobram" com os vetoriais por cima).
5. **Conferência de reuso**: validar que a mesma textura serve, com bom
   acabamento, ao **gameplay** (já integrado) e — na medida do disponível — ao
   **preview do Hangar** e ao **hero da Home** (se P11-08/P11-06 já consumirem
   `spr-ship`; senão, registrar que a arte está pronta para esses usos).
6. **Peso sob controle**: PNG comprimido; manter o arquivo enxuto (o atual ~7KB é
   referência de ordem de grandeza), pois assets do tema ficam fora do precache PWA
   mas ainda contam no download sob demanda.

## Requisitos não funcionais

- **Presentation-only / determinismo**: arte nunca toca `src/sim`/replay/
  `hashState()`/ranking. Trocar o PNG não muda hash/replay (trivial por construção).
- **Fallback é lei**: se a arte for removida/renomeada, a nave volta à silhueta
  vetorial sem erro — não introduzir dependência dura.
- **hitbox ≠ sprite**: o ponto de hitbox e o anel de graze seguem vetoriais por
  cima; a arte não pode escondê-los nem competir com as balas.
- **Paridade com o preview**: proporção alinhada à `shipSilhouette` para o Hangar
  continuar honesto.
- **Mobile-first**: legível a 64px num celular; sem detalhe fino que some na escala.

## Critérios de aceite

- [ ] `public/sprites/ship.png` é a arte definitiva (nível v1), branco/grayscale,
      nariz para cima, footprint 64px, transparente, **sem chama/glow/anel/hitbox**.
- [ ] Em jogo (tema Polido) a nave aparece tingida na cor do cosmético, com chama
      vetorial e bloom (P12-01) por cima, anel de graze e hitbox nítidos
      (conferência manual `npm run dev`).
- [ ] O tint lê limpo (default ciano + ao menos uma cor de cosmético) sem matiz
      parasita.
- [ ] **Nenhuma mudança de código** foi necessária (só o arquivo trocou); o
      fallback vetorial continua funcionando ao remover a chave (smoke test).
- [ ] A proporção casa com `shipSilhouette` (preview do Hangar honesto).
- [ ] `npm run build` verde (build/PWA ok com o novo asset); peso do PNG razoável.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay
      (trivial; reexecutar a suíte).

## Arquivos/módulos provavelmente afetados

- `public/sprites/ship.png` (**substituído** — a entrega principal)
- *(nenhum código)* — `src/config/themes.ts` já registra a chave; `SpriteTheme`/
  `shipVisual`/`spriteFallback` já integram (P10-10)
- *(conferência)* `src/render/SpriteTheme.ts`, `src/scenes/HangarScene.ts`,
  `src/scenes/MenuScene.ts` — só verificar o consumo, não alterar aqui

## Fora de escopo

- **Variantes curadas de cosmético** (`spr-ship-ship-prism`/`-comet`) — P12-02-02.
- **Arte de inimigos / chefe / fundo** — P12-03 / P12-04 / P12-05.
- **Bloom/glow** (chama, brilho do casco) — P12-01 (a arte é "apagada"; o brilho é
  vetorial por cima).
- **Carregar `spr-ship` nas cenas de menu independentemente do tema** (para o hero
  da Home / preview do Hangar fora do tema Polido) — é integração da **Fase 11**
  (P11-06-02 / P11-08-02); aqui só se entrega a arte pronta para esse uso.
- **Promover "Polido" a default** — P12-07.

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` (tabela "Estado por peça": nave segue ✅, agora com arte
  **definitiva v1** — nota curta).
- `docs/ROADMAP.md` (progresso P12-02 — parte nave base).
- `docs/TEST_STRATEGY.md` (checklist manual: nave em gameplay/Hangar, tint, hitbox/
  anel/chama por cima, escala a 64px).
- *(não abrir TD — sem mudança de arquitetura; pipeline e contrato já existem em
  TD-31/TD-33.)*

## Riscos técnicos

- **Matiz embutido brigando com o tint**: autorar branco/grayscale puro; conferir o
  tint default e de cosmético. É o erro mais comum (`§3.2`).
- **Glow/chama embutidos dobrando com os vetoriais**: não pintar brilho/chama na
  arte — eles vêm de P12-01 + engine flame.
- **Footprint enganoso**: asas/efeitos grandes que sugerem hitbox maior — manter a
  massa dentro de 64px (justiça da hitbox).
- **Desalinho com o preview do Hangar**: fugir muito da proporção da
  `shipSilhouette` quebra a promessa "nave em jogo == preview".
- **Peso do arquivo**: arte muito pesada incha o download sob demanda do tema —
  comprimir.

## Sugestão de testes (escrever primeiro)

- (regressão) suíte verde + determinismo reexecutado (trocar arte não muda hash/
  replay) — trivial por construção, mas confirmar.
- (smoke/fallback) remover temporariamente a chave/arquivo ⇒ nave cai no vetorial
  sem erro (cobertura de fallback já existe em P10-09; só confirmar).
- Conferência manual (o grosso): nave em gameplay e Hangar, tint default + cosmético,
  hitbox/anel/chama/bloom por cima, escala/nitidez a 64px no celular — **checklist
  no PR** (`TEST_STRATEGY.md`).
