# [P10-05] Nave como silhueta vetorial coesa (não 5 primitivos soltos)

## Objetivo

Redesenhar a nave no `VectorTheme` para uma **silhueta única e legível** — que
pareça uma nave — em vez da montagem atual de 5 primitivos (glow + chama + asa +
corpo + ponto de hitbox), elevando a estética "Arcade anos 80". Sem mudar
jogabilidade.

## Contexto

- Depende de **P10-02** (`VectorTheme` existe; o desenho da nave já mora lá).
- Hoje `makeShip()` empilha `glow` (círculo), `engine` (triângulo amarelo),
  `wing` (triângulo escuro), `body` (forma `arrow`) e `hitbox` (ponto vermelho) —
  o que o usuário descreveu como "5 objetos soltos, sem cara de nave".
- A forma/cor da nave vêm do **cosmético** (P6-01: `shipShape`/`shipColor`); o
  redesign deve continuar respeitando o loadout (forma do cosmético como base da
  silhueta) e o tamanho **constante entre naves** (hitbox ≠ sprite).

## Requisitos funcionais

1. Compor a nave como uma silhueta coesa (corpo + leitura de "frente/motor/asas")
   com contorno neon e glow integrados — não peças desconexas. Pode usar
   `ui/shapes` (estender com uma geometria de nave mais rica) ou composição
   harmônica de polígonos.
2. Manter o **ponto de hitbox** nítido e pequeno, distinto do corpo (hitbox ≠
   sprite — princípio inegociável), e o **anel de graze** (P5-02-02) por baixo.
3. Manter a **chama do motor** pulsante e o piscar em i-frames
   (`state.invulnerable`), o escalonamento no modo Foco (`setScale(0.7)`).
4. Respeitar o cosmético: forma/cor do loadout continuam aplicadas (a silhueta
   pode derivar da forma do cosmético ou tratá-la como acento — decidir e manter
   coerência com o Hangar/preview).
5. Sem mudança em `src/sim`/`src/systems` e sem alterar a hitbox lógica.

## Requisitos não funcionais

- Render-only; determinismo/replay/`hashState()` intactos.
- Sem `new` no loop (geometria criada no `init`/`create` do tema; só atualização
  de transform/alpha por frame).
- Legibilidade: a nave não pode competir com as balas; perigo > beleza.
- Coerência com o preview do Hangar (a nave em jogo = a nave do preview).

## Critérios de aceite

- [ ] A nave lê visualmente como uma nave coesa (manual no `npm run dev`),
      mantendo identidade neon "arcade".
- [ ] Ponto de hitbox e anel de graze continuam claros; modo Foco encolhe e
      destaca a precisão.
- [ ] Cosméticos de nave (forma/cor) continuam aplicados e coerentes com o
      Hangar/preview.
- [ ] i-frames piscam a nave; chama pulsa.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/VectorTheme.ts` (desenho/composição da nave)
- `src/ui/shapes.ts` (se ganhar geometria de nave mais rica)
- `src/scenes/HangarScene.ts` / `src/ui/hangar.ts` (preview, se a forma mudar)

## Fora de escopo

- Arte raster da nave (P10-10) — aqui é vetorial.
- Redesign de inimigos/chefes (P10-06) e fundo (P10-07).
- Novos cosméticos de nave (catálogo é P6-01).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §estética/nave (silhueta coesa, hitbox ≠ sprite).
- `docs/ROADMAP.md` (progresso P10-05).

## Riscos técnicos

- Silhueta maior "parecer" hitbox maior — manter o ponto de hitbox inequívoco e
  tamanho visual estável entre naves.
- Glow/contorno pesado encobrindo balas em densidade alta — alpha contido.
- Divergência com o preview do Hangar se a forma do cosmético for reinterpretada
  — alinhar os dois ou registrar a regra.

## Sugestão de testes (escrever primeiro)

- Se a geometria virar função pura em `ui/shapes` (vértices da nave), cobrir em
  unidade (vértices/proporções estáveis).
- Regressão de determinismo (reexecutar): visual não toca a sim.
- Feel/legibilidade são manuais — checklist no PR (`TEST_STRATEGY.md`).
