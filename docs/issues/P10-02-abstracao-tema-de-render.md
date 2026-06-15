# [P10-02] Abstração de tema de render (`GameRenderer`) + `VectorTheme`

## Objetivo

Extrair todo o desenho do gameplay hoje inline na `GameScene` para uma
**interface de tema de render** e fornecer a primeira implementação,
**`VectorTheme`** (= o visual atual, realocado, **sem mudança visual**). Isso
destrava temas selecionáveis (Bloco B/C) e tira a `GameScene` de "objeto-deus" —
**sem tocar a simulação**.

## Contexto

- Hoje a `GameScene` mistura ciclo de vida + input + áudio + **todo o desenho**:
  `makeShip`, `drawGrazeRing`, `drawBoss`, `drawReflectFx`, `drawParticles`,
  `drawFocusBar`, blocos de inimigos/tiros/balas e `drawField`/`updateBackground`.
- Tudo isso é **apresentação**: lê o estado autoritativo (`sim.player`,
  `sim.enemies`, `sim.boss`, pools de balas, `sim.fxEvents`) e desenha. Nada disso
  entra em `hashState()`/replay.
- Esta issue é **refactor mecânico** (paridade visual 1:1), não redesign. O
  redesenho da nave/inimigos/chefes/fundo vem depois (P10-05/06/07).

## Requisitos funcionais

1. Definir uma interface `GameRenderer` (nome a confirmar) com métodos por
   responsabilidade visual, ex.: `init(scene)`, `drawBackground(dt)`,
   `drawShip(state)`, `drawEnemies(state)`, `drawBoss(state)`,
   `drawPlayerShots(state)`, `drawEnemyBullets(state)`, `drawReflectFx(state)`,
   `drawParticles(...)`, `drawGrazeRing(...)`, `drawFocusBar(state)`,
   `destroy()`. O recorte exato dos métodos é decisão da sessão (manter coeso).
2. `VectorTheme` implementa a interface **movendo** o código atual da `GameScene`,
   incluindo o loadout cosmético (forma/cor da nave, cor do tiro) e o consumo de
   `effects.json`/partículas. Resultado **pixel-equivalente** ao atual.
3. A `GameScene` passa a manter `private renderer: GameRenderer`, criado no
   `create()`, e **delega** o desenho no `update()`. Continua dona do ciclo de
   vida (loop, input, áudio, HUD/cenas), que **não** migra para o tema.
4. O tema recebe o que precisa do estado autoritativo por parâmetro (ou referência
   à sim somente-leitura); **não** guarda lógica de jogo nem grava estado da sim.
5. HUD textual, botões (pulso/pausa/mudo), anúncios de estágio e barra de vida do
   chefe podem ficar na `GameScene` ou no tema — decidir e registrar; o importante
   é não duplicar.

## Requisitos não funcionais

- **Paridade visual**: o jogo deve parecer idêntico ao atual após o refactor.
- Determinismo/replay/`hashState()`/leaderboard intactos (presentation-only).
- Sem `new` no loop de jogo: pools/`Graphics` continuam pré-criados (no
  `init`/`create`), redesenhados por frame.
- A interface deve comportar uma implementação **sprite** futura (P10-09) sem
  reescrita — pensar o contrato lendo posições, não primitivas de `Graphics`.

## Critérios de aceite

- [ ] `GameScene` não desenha mais diretamente: delega tudo ao `renderer`.
- [ ] `VectorTheme` produz o **mesmo visual** de hoje (conferência manual no
      `npm run dev`: nave, inimigos, chefe, balas, partículas, anel de graze,
      barra de Foco, pulso, fundo estelar).
- [ ] Cosméticos (forma/cor da nave, cor do tiro) continuam aplicados pelo tema.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay
      de antes do refactor.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/GameRenderer.ts` (novo — interface) ou `src/ui/themes/`
- `src/render/VectorTheme.ts` (novo — visual atual realocado)
- `src/scenes/GameScene.ts` (passa a delegar; perde os métodos de desenho)
- `src/ui/shapes.ts`, `src/ui/ParticlePool.ts` (reuso; provavelmente sem mudança)
- `src/services/Cosmetics.ts` (resolução do loadout pode migrar para o tema)

## Fora de escopo

- Qualquer **mudança** de visual (redesign da nave/inimigos/chefes/fundo:
  P10-05/06/07).
- Implementação de `SpriteTheme` e carga de assets (P10-09).
- Abstração de áudio (P10-03) e seletor/persistência de tema (P10-04).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (nova camada `render/` com temas; `GameScene` delega).
- `docs/TECH_DECISIONS.md` **(obrigatório)**: novo TD registrando a abstração de
  tema de render (motivação, contrato lê-estado, paridade visual, regra de
  presentation-only). É mudança de arquitetura.
- `docs/ROADMAP.md` (progresso P10-02).

## Riscos técnicos

- Regressão visual sutil ao mover código (ordem de empilhamento das camadas
  `Graphics`, `setDepth`, alphas) — comparar lado a lado antes/depois.
- Interface vazar primitivas de `Graphics` ⇒ amarra o contrato ao vetorial e
  dificulta o `SpriteTheme`. Modelar por **intenção** (desenhar inimigo em x,y,
  forma, cor), não por "fillCircle".
- Vazamento de responsabilidade: tema acabar guardando estado/lógica de jogo —
  manter o tema só de apresentação.
- Acoplamento de ciclo de vida: pausar/retomar/resize ainda gerenciados pela
  `GameScene`; garantir `init`/`destroy` do tema simétricos.

## Sugestão de testes (escrever primeiro)

- A maior parte é **manual** (paridade visual) — registrar checklist no PR.
- Regressão de determinismo (já existente, reexecutar): mesma seed/inputs ⇒
  mesmo hash — garante que o refactor não tocou a sim.
- Se houver lógica pura extraível (ex.: cálculo de cores/geometria), cobrir em
  unidade; o desenho em si não é unit-testado (`TEST_STRATEGY.md`).
