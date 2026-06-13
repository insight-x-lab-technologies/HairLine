# [P4-04b-03] Conteúdo autoral: ondas novas + estágios 2 e 3 curados

## Objetivo

Usar o formato de P4-04b-01 para criar **conteúdo de verdade**: novas ondas em
JSON e dois estágios curados completos (`stage-002`, `stage-003`) com curva de
dificuldade deliberada (fácil→difícil), chefes distintos e identidade própria.
Hoje há **1 onda autoral** (wave-001) — é o gargalo de conteúdo da Fase 4.

## Contexto

- Depende de **P4-04b-01** (formato + `stage-001` migrado). Independe de
  P4-04b-02 (anúncios) e P4-04b-04 (seletor), mas o seletor precisará destes
  estágios para fazer sentido.
- Feedback pré-lançamento do usuário: **início mais fácil**. O `stage-001`
  deve ser o tutorial de fato (densidade baixa, inimigos lentos); a rampa
  fica entre estágios, não dentro do primeiro.
- Matéria-prima existente: 7 inimigos, 9 padrões, 4 chefes (`ROADMAP.md`,
  contagem atual). Ondas são entradas fixas (`WaveEntry{tick,enemyId,x,y}`) —
  formações "manuais" são posicionamentos coordenados de entries (as
  `Formations` procedurais são só do Endless).

## Requisitos funcionais

1. ≥4 ondas novas em `src/data/waves/` (`wave-002`…), registradas em
   `content/index.ts`. Cada onda com intenção legível (ex.: colunas de drones
   para ensinar graze; parede de turrets; cruzamento weaver+lancer).
2. `stage-002` e `stage-003` em `src/data/stages/`, cada um com 2–3 seções de
   onda + 1 chefe, **chefes diferentes entre si** e do `stage-001`
   (ex.: warden → spinner → gunner/vortex).
3. Revisar `stage-001` para ser o mais fácil (pode ganhar uma 2ª onda leve).
4. Curva entre estágios: densidade de entries, hp via tipos de inimigo e
   janelas de respiro (gaps em ticks entre blocos de spawn) crescem de
   `stage-001` → `stage-003`. Critério prático: o autor termina o stage-001
   sem tomar dano e o stage-003 exige uso de pulso.
5. Balanceamento **somente em JSON** — zero mudança de código esperada nesta
   issue (se faltar expressividade no formato, voltar ao spec: é sinal de que
   P4-04b-01 precisa de emenda registrada, não de gambiarra).

## Requisitos não funcionais

- Determinismo trivial (ondas são fixas), mas cada estágio ganha um teste de
  hash golden para travar regressões de conteúdo.
- Orçamento de pools respeitado: pico de inimigos simultâneos ≤ 64
  (`ENEMY_CAPACITY`) e de balas ≤ 2048 — validar por teste, não por olho.
- Legibilidade do perigo > beleza (princípio de design): sem spawn em cima da
  nave; entradas sempre por `y < 0`.

## Critérios de aceite

- [ ] `npm test` valida todo o conteúdo novo (ids existentes, seções válidas).
- [ ] Teste headless por estágio: spawns ocorrem nos ticks esperados; pico de
      `enemies.activeCount`/`enemyBullets.activeCount` dentro do orçamento.
- [ ] Hash golden por estágio (N ticks, input neutro) registrado.
- [ ] Sessão de jogo manual dos 3 estágios com anotação de dificuldade
      percebida no PR (start fácil confirmado).
- [ ] Contagem de conteúdo atualizada no `ROADMAP.md` (ondas autorais ≥5).
- [ ] `npm run build`, `npm test`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/data/waves/wave-00{2..5}.json` (novos)
- `src/data/stages/stage-002.json`, `stage-003.json` (novos),
  `stage-001.json` (revisão)
- `src/content/index.ts` (registro dos novos ids)
- `tests/content.test.ts`, `tests/stages.test.ts` (novo, smoke por estágio)

## Fora de escopo

- Inimigos, padrões de bala ou chefes **novos** (P4-02b cobre chefes; padrões
  novos só com o editor P4-06).
- Mudanças no formato de stage/wave (qualquer emenda volta para P4-04b-01).
- Seletor/desbloqueio (P4-04b-04); anúncios (P4-04b-02).
- Balancear o Endless (`difficulty.json` não muda aqui).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (seção curta: filosofia da curva entre estágios).
- `docs/ROADMAP.md` (contagem de conteúdo + progresso P4-04b).

## Riscos técnicos

- Onda que termina com inimigo "imortal por design" (turret parada fora do
  alcance?) travaria a transição de seção — garantir que todo inimigo morre ou
  sai do campo (a seção termina por pool vazio).
- Empilhar entries no mesmo tick além do orçamento do pool silenciosamente
  descarta spawns (`EnemyPool.spawn` retorna null) — por isso o teste de pico.
- Dificuldade é subjetiva: travar via teste apenas o que é objetivo (picos,
  ticks, hashes) e deixar o juízo fino para o playtest manual.

## Sugestão de testes (escrever primeiro)

- Por estágio: simular com input neutro e afirmar (a) primeiro spawn no tick
  da primeira entry; (b) pico de ativos ≤ capacidade; (c) hash golden estável.
- `tests/content.test.ts`: todos os `waveId`/`bossId`/`enemyId`/`patternId`
  referenciados pelos 3 estágios existem no registro.
- Ordem de dificuldade objetiva: total de entries e cadência média de spawn
  crescem de stage-001 → stage-003 (guarda-corpo grosseiro, mas barato).
