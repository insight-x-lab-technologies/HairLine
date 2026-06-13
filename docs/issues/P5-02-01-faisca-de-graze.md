# [P5-02-01] Faísca no momento do graze (evento com posição + partículas)

## Objetivo

Tornar o graze *visível no instante em que acontece*: emitir um evento de FX
com a posição da bala raspada e disparar uma faísca curta ali, além de
destacar brevemente a própria bala grazeada. O graze é a alma do jogo
(PRODUCT_VISION §wedge) e hoje só "toca um som e soma um número".

## Contexto

- Depende de **P5-01-02** (`ParticlePool`) e **P5-01-03** (buffer `fxEvents`
  na `Simulation` — cujo schema já foi desenhado para comportar `graze`).
- `updateGraze()` (`src/systems/GrazeSystem.ts`) marca `b.grazed = true` e
  chama `state.addGraze()` — é o ponto exato, com a posição da bala em mãos.
- A bala grazeada **continua ativa** e o render já relê o pool por frame: a
  flag `grazed` pode ser lida pela cena para destaque visual sem custo extra.

## Requisitos funcionais

1. Adicionar tipo `graze` ao buffer `fxEvents`, emitido por `updateGraze()` na
   posição da bala no tick do graze (a assinatura da função ganha o
   emissor/buffer como parâmetro; testes existentes seguem valendo com
   emissor opcional ou stub).
2. `GameScene` consome eventos `graze` → burst pequeno e curto no
   `ParticlePool` (2–4 partículas, vida ≤ 200 ms), cor própria da identidade
   de graze/Foco (distinta de kill e de dano), parâmetros em
   `src/data/effects.json` (seção `particles.graze`).
3. Destaque da bala grazeada: ao desenhar balas, as com `grazed = true` ganham
   diferença sutil e permanente (ex.: núcleo mais claro / glow levemente
   maior) — comunica "essa já paguei o risco e venci".
4. Cap de consumo por frame para tempestades de graze (padrões densos podem
   grazear dezenas de balas num tick) — configurável no JSON; o contador de
   graze e o Foco obviamente não são afetados pelo cap (só o visual).
5. Sem mudança de regra: nenhum valor de `combat.json` (margem, Foco por
   graze) muda nesta issue.

## Requisitos não funcionais

- Determinismo intacto: evento é função pura do tick; `fxEvents` segue fora do
  `hashState()`; replays existentes verificam sem edição.
- Sem alocação no loop (eventos e partículas vêm de estruturas pré-alocadas).
- Legibilidade > beleza: a faísca não pode parecer bala nem encobrir balas
  reais — pequena, rápida, sem trajetória "ameaçadora".

## Critérios de aceite

- [ ] Headless: graze no tick T ⇒ evento `graze` com a posição da bala nesse
      tick; sem evento duplicado para a mesma bala (flag `grazed`).
- [ ] Headless: tick com N grazes ⇒ N eventos (até a capacidade do buffer).
- [ ] `hashState()` de runs conhecidas não muda (regressão de determinismo).
- [ ] Manual no `npm run dev`: raspar uma bala produz faísca clara no ponto do
      graze; bala grazeada visivelmente "vencida"; padrão denso não vira ruído.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/systems/GrazeSystem.ts` (emitir evento; assinatura)
- `src/sim/Simulation.ts` (passar o buffer ao `updateGraze`)
- `src/scenes/GameScene.ts` (consumo → burst; desenho de bala grazeada)
- `src/data/effects.json` + `src/content/` (seção `particles.graze`, validação)
- `tests/GrazeSystem.test.ts`, `tests/Simulation.test.ts` (ou `FxEvents.test.ts`)

## Fora de escopo

- Anel de graze na nave (P5-02-02) e HUD de Foco (P5-02-03).
- Mudar balanceamento de graze (margem, Foco, pontos).
- Slow-motion/zoom no graze; haptics (P5-04).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Mecânica central e §Feedback/juice.
- `docs/ROADMAP.md` (progresso P5-02).

## Riscos técnicos

- Tempestade de graze (wall/ring denso) saturando buffer e poluindo a tela —
  o cap visual é parte do design, não otimização tardia.
- Destaque da bala grazeada confundir com tipo de bala diferente — mudar
  brilho/núcleo, **não** forma nem cor-base.
- Acoplar `GrazeSystem` ao tipo do buffer — receber interface mínima
  (`emit(type, x, y)`), mantendo o sistema testável isolado.

## Sugestão de testes (escrever primeiro)

- Bala entra no anel ⇒ `grazed`, `addGraze`, **e** evento com posição correta.
- Mesma bala em ticks seguintes ⇒ nenhum evento novo.
- Bala que acerta (dentro do hitDist) ⇒ sem evento de graze (colisão cuida).
- Determinismo: mesma seed/inputs ⇒ mesma sequência de eventos `graze`;
  `hashState()` final idêntico ao pré-feature.
