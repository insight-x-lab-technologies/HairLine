# [P4-02b-02] Mecânica de escudo do chefe (invulnerabilidade quebrável)

## Objetivo

Adicionar a primeira mecânica única de chefe: um **escudo** declarável por fase
que torna o chefe invulnerável até ser quebrado a tiros (HP próprio do escudo),
criando janelas de ataque e ritmo de "quebrar → punir".

## Contexto

- Depende de **P4-02b-01** (campo opcional por fase no novo schema).
- Hoje todo dano vai direto ao HP do chefe (`CollisionSystem` → `Boss.onHit`).
- Aplicar ao **warden** (chefe "guardião" — tema combina) na fase 2, como
  primeiro uso real.

## Requisitos funcionais

1. Campo opcional por fase: `shield: { hp: number, rechargeTicks?: number }`.
   Ao entrar na fase, o escudo nasce com `hp` cheio.
2. Com escudo ativo, tiros do jogador acertam o escudo (mesma hitbox do chefe):
   reduzem o HP **do escudo**; o HP do chefe não muda.
3. Escudo com `hp <= 0` quebra. Se `rechargeTicks` definido, volta cheio após
   esse intervalo **dentro da mesma fase**; senão, fica quebrado até a fase acabar.
4. Estado do escudo exposto para o render (ativo/HP%) e para o `hashState()`.
5. Render (GameScene): anel/hexágono neon ao redor do chefe enquanto ativo,
   flash ao quebrar; SFX de quebra via `AudioCues` (estado → som, sem lógica nova
   na cena).
6. `warden.json` ganha escudo na fase 2; balanceamento (HP do escudo) no JSON.

## Requisitos não funcionais

- Lógica 100% headless em `src/systems/` (render só lê estado).
- Cadência em ticks; nada de tempo de parede.
- Sem alocação no loop (escudo é estado do `Boss`, não objeto novo por tick).

## Critérios de aceite

- [ ] Headless: com escudo ativo, N acertos não reduzem HP do chefe; após HP do
      escudo zerar, o acerto seguinte reduz o HP do chefe.
- [ ] `rechargeTicks`: escudo quebrado reativa após o intervalo, na mesma fase.
- [ ] Trocar de fase descarta/recria escudo conforme a fase nova.
- [ ] Escudo entra no `hashState()` (replay com escudo verifica via `verifyReplay`).
- [ ] Visual do escudo visível e legível no warden (conferir no `npm run dev`).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts` (BossPhaseDef.shield), `src/content/index.ts` (validação)
- `src/systems/BossSystem.ts` (estado/tick do escudo, desvio de dano em `onHit`)
- `src/sim/Simulation.ts` (hash) — só se o estado não viver no `Boss`
- `src/systems/AudioCues.ts`, `src/scenes/GameScene.ts` (render/som)
- `src/data/bosses/warden.json`
- `tests/BossSystem.test.ts`, `tests/Simulation.test.ts`

## Fora de escopo

- Escudo direcional/segmentado; escudo que reflete balas.
- Adds protegendo o chefe (P4-02b-03) ou partes (P4-02b-04).
- Rebalancear os outros 3 chefes.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Chefes (campo `shield` + comportamento).
- `docs/ROADMAP.md` (progresso P4-02b).

## Riscos técnicos

- Esquecer o escudo no `hashState()` quebra anti-cheat/replay silenciosamente.
- Dano "vazando" no mesmo tick em que o escudo quebra — definir regra clara
  (dano excedente do tiro que quebrou é descartado; simples e determinístico).
- Legibilidade: o jogador precisa ver que o chefe está imune (P5 cuida do polish,
  mas o estado visual mínimo entra aqui).

## Sugestão de testes (escrever primeiro)

- Escudo absorve dano até quebrar; excedente do golpe que quebra não vaza.
- Recarga: quebra no tick T ⇒ reativa em T+rechargeTicks; sem recarga ⇒ nunca.
- Transição de fase com escudo ativo ⇒ estado coerente na fase nova.
- Determinismo: run com warden (escudo) duas vezes ⇒ mesmo hash; `verifyReplay` ok.
