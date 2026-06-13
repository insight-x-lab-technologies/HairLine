# [P5-01-03] Juice de impacto e kill (eventos com posição + partículas)

## Objetivo

Fazer cada impacto *ser sentido*: faíscas quando um tiro acerta inimigo,
explosão na cor/forma do inimigo ao morrer, estilhaço quando o jogador toma
dano. Para isso, expor na simulação um **buffer de eventos de FX com posição**
(hoje as cues de `AudioCues` são só contadores, sem onde aconteceu).

## Contexto

- Depende de **P5-01-01** (config) e **P5-01-02** (`ParticlePool`).
- `diffCues()` detecta *que* houve kill/hit/graze, mas não *onde* — o render
  não tem a posição do inimigo morto (ele já saiu do pool no mesmo tick).
- Precedente arquitetural: `sim.lastReflect` já é estado observável exposto
  pela `Simulation` só para o render — o buffer de eventos segue esse padrão.
- Feedback pré-lançamento pediu **clareza de dano**: o jogador precisa ver
  que acertou e que matou.

## Requisitos funcionais

1. Na `Simulation`, buffer pré-alocado de eventos de FX do tick corrente
   (ex.: `fxEvents`, capacidade fixa ~64, limpo por reset de índice a cada
   tick): `{ type, x, y, color?, radius? }` com tipos `shotHit`, `kill`,
   `playerHit`, `bossPhase` (preencher `color`/`radius` do inimigo/chefe).
2. Preenchimento nos pontos existentes: `resolveShotsVsEnemies` (impacto e
   kill), `resolvePlayerVsBullets` (dano), troca de fase/morte de chefe no
   `BossSystem`. Saturação do buffer descarta o excedente (nunca aloca).
3. O buffer **não** entra em `hashState()` (é derivado e decorativo; manter os
   hashes de replays existentes válidos).
4. `GameScene` consome o buffer após `loop.advance()` e dispara bursts no
   `ParticlePool`, com parâmetros por tipo de evento em
   `src/data/effects.json` (seção `particles`): contagem, velocidade, vida,
   tamanho; cor herdada do evento.
5. Juice de kill além das partículas: micro-shake opcional configurável por
   evento (ex.: kill de chefe usa shake; kill comum não) — tudo no JSON.
6. Graze fica de fora (P5-02 é o épico do feedback de graze), mas o tipo de
   evento deve comportar adicioná-lo depois sem mudar o schema.

## Requisitos não funcionais

- Determinismo intacto: o buffer é função pura do tick; testes de replay e
  `verifyReplay` continuam passando sem mudança.
- Sem alocação no loop: buffer e objetos de evento pré-alocados e reusados.
- Legibilidade > beleza: partículas não podem ser confundíveis com balas
  (tamanho menor, vida curta, sem movimento "em direção ao jogador").

## Critérios de aceite

- [ ] Headless: matar inimigo no tick T produz evento `kill` com a posição e
      cor do inimigo nesse tick; buffer zera no tick seguinte.
- [ ] Headless: dano ao jogador produz `playerHit` na posição da nave.
- [ ] Saturação do buffer não aloca nem estoura (65º evento é descartado).
- [ ] `hashState()` de uma run conhecida **não muda** com esta issue
      (replays/testes de determinismo existentes passam sem edição).
- [ ] Manual no `npm run dev`: acerto, kill, kill de chefe e dano ao jogador
      visivelmente distintos; densidade alta não vira ruído ilegível.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/sim/Simulation.ts` (buffer `fxEvents` + limpeza por tick)
- `src/systems/CollisionSystem.ts` (emitir `shotHit`/`kill`/`playerHit`)
- `src/systems/BossSystem.ts` (emitir `bossPhase`/kill de chefe)
- `src/scenes/GameScene.ts` (consumir buffer → bursts)
- `src/data/effects.json` (seção `particles` por tipo de evento)
- `src/content/types.ts`/`index.ts` (tipo + validação da seção nova)
- `tests/Simulation.test.ts` (ou novo `tests/FxEvents.test.ts`)

## Fora de escopo

- Feedback visual de graze (P5-02).
- Hit-stop (P5-01-04).
- Trails/rastros de balas, shaders, pós-processamento.
- Rebalancear shake/flash existentes.

## Riscos técnicos

- Tentação de colocar o buffer no hash "por completude" — quebraria todos os
  replays gravados; manter fora e documentar o porquê no código.
- Ordem de consumo: o render precisa ler o buffer do **último** tick executado
  no frame; com múltiplos ticks por frame, eventos de ticks intermediários
  somem — aceitável para FX (documentar) ou acumular entre leituras (decidir
  na implementação; a opção simples primeiro).
- Poluição visual em densidade alta (formações + chefe) — caps por frame no
  consumo, configuráveis no JSON.

## Sugestão de testes (escrever primeiro)

- Tick com 2 kills e 1 shotHit ⇒ buffer com 3 eventos corretos (tipo, posição,
  cor); próximo tick ⇒ buffer vazio.
- Evento `playerHit` respeita i-frames (sem evento duplicado durante
  `invulnTicks`).
- Buffer saturado descarta sem alocar (capacidade respeitada).
- Determinismo: mesma seed/inputs ⇒ mesma sequência de eventos; e
  `hashState()` idêntico ao de antes da feature (regressão).
