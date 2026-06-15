# [P10-07] Fundo de espaço procedural rico + parallax multicamada

## Objetivo

Evoluir o fundo do gameplay de um starfield simples de uma camada para um **fundo
de espaço procedural** com **parallax multicamada** (estrelas em profundidades +
nebulosas), reforçando a estética "Arcade anos 80" — sem assets raster e sem
afetar a simulação.

## Contexto

- Depende de **P10-02** (`VectorTheme` desenha o fundo via `drawBackground`).
- Hoje: `drawField()` cria um retângulo de fundo + 90 estrelas (uma camada) e
  `updateBackground()` as desce com velocidade ∝ profundidade; usa `Rng` decorativo
  com seed do relógio (sem `Math.random`).
- É decorativo: não entra em `hashState()`; pode usar tempo de parede/`delta`.

## Requisitos funcionais

1. Múltiplas camadas de profundidade com parallax distinto (estrelas distantes
   lentas/pequenas, próximas rápidas/maiores).
2. Camada de **nebulosa** procedural (gradientes/blobs suaves) com deriva lenta,
   sem competir com a leitura das balas.
3. Densidade/cores/velocidades em **dados** (presentation-only — ex.:
   `src/data/effects.json` numa seção `background`, ou config do tema), não
   hardcoded.
4. Continuar usando `Rng` decorativo (proibido `Math.random`); reciclagem de
   estrelas ao sair da tela como hoje (sem `new` por frame).
5. Sem mudança em `src/sim`/`src/systems`.

## Requisitos não funcionais

- Render-only; determinismo intacto.
- **Performance**: fundo não pode derrubar o FPS em celular (alvo da P5-06);
  considerar custo das nebulosas (preferir poucas camadas baratas a blur caro).
- Legibilidade: fundo é fundo — contraste baixo, nunca disputa com balas/anel.
- Sem alocação por frame (pools/arrays pré-alocados, como o starfield atual).

## Critérios de aceite

- [ ] Fundo tem sensação de profundidade (parallax) e nebulosa sutil (manual no
      `npm run dev`).
- [ ] Parâmetros vêm de dados (mudar densidade/cor no JSON muda o fundo sem
      código).
- [ ] FPS estável em celular de referência; sem queda perceptível vs. o starfield
      atual.
- [ ] Balas/anel de graze continuam perfeitamente legíveis sobre o fundo.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/VectorTheme.ts` (`drawBackground`/setup das camadas)
- `src/data/effects.json` + `src/content/` (seção `background`, validação) — ou
  config do tema
- `src/services/Rng.ts` (reuso; sem mudança)

## Fora de escopo

- Fundo em **arte raster** (P10-11).
- Redesign de nave/inimigos/chefes (P10-05/06).
- Modo de qualidade alto/baixo automático (P5-06) — só não regredir aqui.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §estética/fundo (parallax + nebulosa procedural).
- `docs/ROADMAP.md` (progresso P10-07).

## Riscos técnicos

- Nebulosa cara (muitos fills/alpha grandes) derrubando o FPS — medir e conter;
  preferir gradiente barato a muitos círculos translúcidos.
- "Sujar" o campo e reduzir legibilidade — alpha/contraste no JSON para iterar.
- Padrão visual perceptível por poucas estrelas/seed ruim — densidade adequada.

## Sugestão de testes (escrever primeiro)

- Integridade de dados: seção `background` validada (densidades/alphas em faixa).
- Se houver função pura (ex.: distribuição/reciclagem de camadas), cobrir.
- Performance/legibilidade são manuais — checklist no PR com FPS observado.
