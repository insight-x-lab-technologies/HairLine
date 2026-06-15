# [P10-11] Fundo de espaço em arte (parallax raster) para o tema "Polido"

## Objetivo

Substituir o fundo procedural por **camadas de arte raster** com parallax quando o
tema "Polido" está ativo, mantendo o fundo procedural no tema "Arcade". Sem afetar
a simulação.

## Contexto

- Depende de **P10-09** (`SpriteTheme` + pipeline de assets/PWA por tema) e
  idealmente após **P10-07** (parallax procedural já estruturado, serve de
  referência de camadas/velocidades).
- O fundo é decorativo (fora de `hashState`) — pode usar `delta`/tempo de parede;
  reciclagem/tiling sem alocação por frame.

## Requisitos funcionais

1. Camadas de fundo ilustradas (ex.: espaço distante + nebulosa + estrelas
   próximas) com **tiling vertical** e parallax por camada, derivando velocidades
   de dados (presentation-only).
2. Ativas **somente no tema "Polido"**; no "Arcade", segue o procedural (P10-07).
3. Carga condicional dos assets de fundo via manifesto do tema (P10-04/09);
   precache PWA só no "polido".
4. **Fallback**: sem os assets de fundo, cair no fundo procedural sem erro.
5. Sem tocar `src/sim`/`src/systems`.

## Requisitos não funcionais

- Determinismo intacto.
- Performance/peso: fundo raster em tela cheia é caro em celular — usar texturas
  tileáveis enxutas, poucas camadas; medir FPS (P5-06).
- Legibilidade: contraste baixo; balas/anel sempre por cima e legíveis.
- Sem `new` no loop (sprites/tilesprites pré-criados).

## Critérios de aceite

- [ ] Tema "Polido" mostra fundo de espaço em arte com parallax (manual no
      `npm run dev`); "Arcade" mantém o procedural.
- [ ] Velocidades/camadas vêm de dados.
- [ ] Sem assets de fundo ⇒ fallback procedural sem erro.
- [ ] Assets de fundo só carregam/precacheiam no "polido".
- [ ] FPS estável em celular de referência; balas legíveis.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/SpriteTheme.ts` (fundo raster + parallax/tiling)
- `public/` ou `src/assets/` (texturas de fundo; placeholder aceitável)
- `src/scenes/PreloadScene.ts` + manifesto do tema (entrada do fundo)
- `vite.config.ts` (PWA: precache por tema, se necessário)

## Fora de escopo

- Fundo procedural (P10-07) e demais artes (nave/chefes/inimigos — P10-10).
- Efeitos de fundo reativos a gameplay (ex.: fundo mudando no chefe) — issue
  própria se desejado.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §estética (fundo do tema Polido).
- `docs/ROADMAP.md` (progresso P10-11).

## Riscos técnicos

- Fundo raster em tela cheia derrubando FPS/memória em celular — medir; texturas
  tileáveis pequenas; limitar camadas.
- Emenda de tiling visível — texturas preparadas para tile contínuo.
- Inchar o PWA — assets só no manifesto do tema "polido".

## Sugestão de testes (escrever primeiro)

- (headless) cálculo de offset de parallax/tiling por camada (função pura).
- Fallback: sem assets ⇒ procedural (reuso do padrão de P10-09).
- Performance/peso/legibilidade são manuais — checklist no PR.
