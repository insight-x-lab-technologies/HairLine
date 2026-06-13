# [P5-01-02] Pool de partículas (render-side, pré-alocado)

## Objetivo

Criar a infraestrutura de partículas do jogo: um `ParticlePool` pré-alocado,
puramente decorativo (fora da simulação), com API de "burst" e update por
frame, desenhado pela `GameScene` via `Graphics` — no mesmo espírito de
`BulletPool`/`EnemyPool`.

## Contexto

- Hoje **não existe** nenhuma partícula; o único FX dinâmico é o anel do pulso
  (`drawReflectFx`).
- Partículas são apresentação: não entram em `src/sim/`, não afetam
  `hashState()` nem replay. Mas a *estrutura de dados* do pool é lógica pura e
  testável headless (sem Phaser).
- Pooling é obrigatório (CLAUDE.md §4): nunca `new` no loop de render.
- O ESLint barra `Math.random()`. A aleatoriedade decorativa (espalhamento de
  velocidade/ângulo) usa uma instância **local** de `Rng`
  (`src/services/Rng.ts`) com seed arbitrária — fora da sim, não entra no
  replay, mas respeita o lint e fica reproduzível em teste.

## Requisitos funcionais

1. `ParticlePool` com capacidade fixa (ex.: 512), arrays/structs pré-alocados:
   `x, y, vx, vy, ageTicks, lifeTicks, size, color, alpha`, flag `active`.
2. API `burst(opts)`: origem, contagem, velocidade base + espalhamento, vida,
   tamanho, cor(es), gravidade/atrito opcionais. Sem alocação por chamada
   (opções passadas por objeto reutilizável ou parâmetros).
3. `update(dtTicks)` avança posição/idade/alpha e desativa partículas vencidas.
   Decaimento de alpha/tamanho ao longo da vida (lerp simples).
4. Saturação: se o pool encher, novas partículas **substituem as mais antigas**
   ou são descartadas (escolher e documentar) — nunca alocar além da capacidade.
5. Render: novo método na `GameScene` que percorre o pool ativo e desenha via
   `Graphics` (círculos/quadrados pequenos com glow barato: fill + alpha),
   em camada própria (`fxGfx` ou nova).
6. Nesta issue, ligar **um** uso de demonstração: partículas no anel do pulso
   refletor (burst dourado a partir de `sim.lastReflect`), para validar o
   pipeline de ponta a ponta.

## Requisitos não funcionais

- Zero `new`/closures por frame depois da pré-alocação (GC-friendly; o alvo é
  celular fraco — P5-06).
- O pool não importa nada de Phaser (testável em Vitest node).
- A simulação não conhece o pool; o fluxo é unidirecional sim → render.
- Orçamento: pool cheio (512) desenhado a 60 fps sem queda perceptível em
  desktop (medição formal de mobile fica para P5-06).

## Critérios de aceite

- [ ] `ParticlePool` headless coberto por testes (spawn, vida, desativação,
      saturação, determinismo com `Rng` semeado).
- [ ] Sem alocação no caminho quente (revisão de código: `burst`/`update` não
      criam objetos).
- [ ] Pulso refletor emite partículas visíveis no `npm run dev`.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/ui/ParticlePool.ts` (novo — render-side, sem Phaser)
- `src/scenes/GameScene.ts` (instanciar, atualizar, desenhar; hook no pulso)
- `src/data/effects.json` (parâmetros do burst do pulso — depende de P5-01-01)
- `tests/ParticlePool.test.ts` (novo)

## Fora de escopo

- Partículas de impacto/kill/dano (P5-01-03) — aqui só a infraestrutura + o
  burst do pulso como prova.
- Phaser Particle Emitter nativo (decisão: pool próprio + Graphics, coerente
  com TD-08; se for revertido, registrar em `TECH_DECISIONS.md`).
- Redução de flashes/acessibilidade (P5-05).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (camada de FX render-side: pool + quem desenha).
- `docs/TECH_DECISIONS.md` (TD novo: partículas via pool próprio + Graphics,
  e Rng local decorativo fora do replay).
- `docs/ROADMAP.md` (progresso P5-01).

## Riscos técnicos

- Vazamento de aleatoriedade decorativa para a lógica (alguém "aproveitar" o
  Rng do pool na sim) — deixar o Rng privado do pool e comentar a fronteira.
- Custo de fill com alpha por partícula no `Graphics` pode pesar em mobile —
  manter formas simples; glow caro (2º fill maior) só se sobrar orçamento.
- Partículas atualizadas por delta de frame (parede) vs ticks: como é
  decorativo, usar tempo de render é aceitável — documentar a escolha para
  ninguém "corrigir" para ticks da sim depois.

## Sugestão de testes (escrever primeiro)

- `burst` ativa N partículas com posições/velocidades derivadas do Rng semeado
  (mesma seed ⇒ mesmas partículas).
- `update` mata partículas após `lifeTicks` e libera slots para reuso.
- Saturação: burst além da capacidade respeita a política escolhida e nunca
  passa do limite.
- Alpha/size decaem monotonicamente ao longo da vida.
