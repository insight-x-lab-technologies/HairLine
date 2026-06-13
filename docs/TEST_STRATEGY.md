# TEST_STRATEGY — HAIRLINE

> Doc de memória: como testamos. Base: `03-processo-de-desenvolvimento.md`.
> Estado atual: **204 testes, 32 arquivos** (Vitest), todos verdes.

## Filosofia

Bullet hell tem lógica determinística pesada (RNG, padrões, colisão, score) →
**altamente testável**. Render e "feel" **não** são testados automaticamente —
isso é teste manual (jogar no celular). **Teste-primeiro** para toda peça com
lógica.

## Pirâmide

| Tipo | O que cobre | Onde |
|---|---|---|
| Unit (puro/headless) | Rng, Player, AutoFire, pools, PatternSystem, Collision, Graze, ReflectPulse, Difficulty, Formations, Modifiers, BossSystem/Director, GameState, DailySeed, ShareCard, ShareImage(nome), Leaderboard, PlayerIdentity, hudLayout, shapes | `tests/*.test.ts` (env `node`) |
| Integração (sim) | `Simulation` por modo: determinismo, Endless, chefe, Boss Rush, mods | `tests/Simulation.test.ts` |
| Replay/determinismo | gravar → `verifyReplay` bate; adulterar → falha; mods no replay | `tests/Replay.test.ts` |
| DOM (jsdom) | `InputService` (toque/mouse/teclado → eventos lógicos) | `*.dom.test.ts` |
| Integridade de dados | todo enemy/boss/wave referencia conteúdo existente | `tests/content.test.ts` |
| Manual | feel, legibilidade, performance em celular | humano |

## O teste mais importante: determinismo

`Simulation` com mesma `seed`/`mode`/`mods` + mesmos inputs ⇒ mesmo
`hashState()`. Se quebrar, o **Diário e o ranking estão comprometidos**.
`Replay.test` é o guardião: re-simula e exige hash+score idênticos.

## Convenções

- Ambiente padrão **node** (headless). DOM só em arquivos `*.dom.test.ts`
  (docblock `// @vitest-environment jsdom`).
- Aleatoriedade em teste: sempre `Rng` com seed fixa; nunca `Math.random`.
- Cuidado com ponto flutuante: usar `toBeCloseTo`, divisores exatos, e tratar
  `-0` (ver `Formations`).
- Stores injetáveis (localStorage fake) em SaveService/Leaderboard/PlayerIdentity.
- `fetch` mockado (`FetchLike`) para `RemoteLeaderboard`.

## Regra de ouro (agente)

**Nunca** "passar" um teste alterando o teste para acomodar um bug. Se um teste
precisa mudar, é decisão humana, registrada no commit. Valores golden (ex.: Rng)
são calculados por referência independente, não ajustados ao código.

## Definition of Done (por funcionalidade)

- [ ] Teste(s) escritos primeiro e passando.
- [ ] Determinismo preservado (`Replay`/golden não quebraram).
- [ ] `npm run typecheck` + `lint` + `format:check` limpos.
- [ ] `npm test` verde; `npm run build` (PWA) ok.
- [ ] Revisado e **jogado** pelo humano (feel/legibilidade).
- [ ] Item marcado em `ROADMAP.md`.

## Comandos

```bash
npm test            # Vitest headless (CI usa este)
npm run test:watch  # desenvolvimento
npm run typecheck   # tsc --noEmit (estrito)
npm run lint        # ESLint (barra Math.random)
npm run format      # Prettier
npm run build       # typecheck + build + PWA
```

## Lacunas conhecidas (oportunidades)

- E2E (Playwright) do fluxo menu→jogo→resultado: ainda não há (opcional).
- Cobertura de cenas Phaser é mínima (presentation): aceitável; foco no headless.
- Performance/orçamento de frame não tem teste automatizado (Fase 5, manual).
