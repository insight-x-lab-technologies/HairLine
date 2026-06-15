# [P10-10] Arte raster incremental (nave → chefes → inimigos) sobre o `SpriteTheme`

## Objetivo

Integrar a **arte raster** real ao `SpriteTheme`, peça por peça, sem nunca quebrar
o jogo (o que não tiver arte segue vetorial via fallback). Esta issue estabelece o
**fluxo de integração de uma peça** e entrega a **primeira (nave)**; chefes e
inimigos seguem o mesmo fluxo em sessões subsequentes.

## Contexto

- Depende de **P10-09** (`SpriteTheme` + fallback + pipeline de assets).
- **Ambiguidade registrada:** o item de roadmap agrupa "nave → chefes → inimigos",
  o que é grande demais para uma sessão. **Menor implementação segura:** esta
  issue cobre o **fluxo + a nave**; chefes e inimigos viram repetições do mesmo
  fluxo (sub-sessões P10-10a/b ou issues próprias). Produzir a arte é tarefa de
  conteúdo; o código aqui é integração (placeholder serve para validar, arte final
  pode chegar depois pelo mesmo slot).
- Estados visuais já existem nos dados: i-frames (`state.invulnerable`), fase do
  chefe (`phaseIndex`), partes/escudo — a arte deve mapear neles.

## Requisitos funcionais

1. Definir o **contrato de asset** de uma entidade (chave no atlas, origem/centro =
   posição da sim, escala de referência, mapeamento de estados → variação visual)
   e documentá-lo para repetição.
2. Integrar a **nave** como sprite: posição/rotação/escala da sim, piscar em
   i-frames, encolher no Foco, chama do motor (sprite ou efeito), respeitando o
   cosmético conforme a regra definida em P10-13 (até lá, uma variação default).
3. **Hitbox ≠ sprite**: o ponto de hitbox e o anel de graze continuam vetoriais
   por cima do sprite da nave.
4. Manter o **fallback**: sem o asset, a nave volta ao vetorial sem erro.
5. Sem tocar `src/sim`/`src/systems`.

## Requisitos não funcionais

- Determinismo intacto (apresentação).
- Sem `new` no loop (pool de sprites do P10-09).
- Peso/PWA por tema (assets só no "polido").
- Performance em celular: orçamento de textura/draw calls observado (P5-06).
- Legibilidade preservada (a arte não pode esconder a hitbox nem competir com
  balas).

## Critérios de aceite

- [ ] Com o tema "Polido", a nave aparece em arte raster, com i-frames/Foco/chama
      corretos; hitbox e anel vetoriais por cima (manual no `npm run dev`).
- [ ] Sem o asset, a nave cai no vetorial sem erro (fallback comprovado).
- [ ] Contrato de asset documentado o suficiente para repetir em chefe/inimigo.
- [ ] Nenhum asset carregado no tema arcade.
- [ ] Regressão de determinismo: tema/arte não mudam `hashState()`/replay.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/SpriteTheme.ts` (integração da nave + mapeamento de estados)
- `public/` ou `src/assets/` (atlas/arte da nave; placeholder aceitável)
- `src/scenes/PreloadScene.ts` (entrada da nave no manifesto do tema)
- `docs/` (contrato de asset)

## Fora de escopo

- Arte de **chefes** e **inimigos** (sub-sessões/issues seguintes pelo mesmo
  fluxo).
- Fundo raster (P10-11), áudio (P10-12), cosméticos×tema (P10-13).
- Animação por frames/skeletal (issue própria se desejada).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` ou um doc de assets (contrato de asset por entidade).
- `docs/GAME_DESIGN.md` §estética (tema Polido: nave).
- `docs/ROADMAP.md` (progresso P10-10 — marcar parcial: nave feita; chefes/
  inimigos pendentes).

## Riscos técnicos

- Desalinhamento sprite × hitbox (origem/escala) — fixar centro = posição da sim e
  validar visualmente.
- Inconsistência de estilo entre arte e os elementos vetoriais que permanecem
  (balas/anel/hitbox) — curar a paleta para conviver com o neon.
- Crescimento de atlas/memória ao adicionar peças — controlar por sessão.

## Sugestão de testes (escrever primeiro)

- (headless) mapeamento estado→variação de sprite (função pura: i-frames/Foco ⇒
  alpha/escala/quadro esperado), sem Phaser.
- Fallback: sem asset da nave ⇒ usa vetorial (reuso do teste de P10-09).
- Alinhamento/feel/peso são manuais — checklist no PR.
