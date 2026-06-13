# [P4-02b-06] Chefe novo com ≥3 fases combinando mecânicas (encerra P4-02b)

## Objetivo

Criar o **5º chefe** ("colossus" ou nome melhor) com **3+ fases** que combinam
as mecânicas novas — ex.: fase 1 partes destrutíveis, fase 2 escudo + adds,
fase 3 teleporte com padrão agressivo — provando que o sistema compõe e
**encerrando P4-02/P4-02b** no roadmap.

## Contexto

- Depende de **P4-02b-01..05** (usa o schema e as mecânicas prontas).
- 100% data-driven: esta issue deve ser **quase só JSON + registro + balance**.
  Se exigir código novo na sim, algo vazou das issues anteriores (sinal de
  retrabalho — voltar lá em vez de remendar aqui).
- Chefes entram na rotação do Endless (`BossDirector`) e no Boss Rush
  (`BossRushDirector`) via registro em `content/index.ts`.

## Requisitos funcionais

1. Novo `src/data/bosses/<id>.json` com ≥3 fases, cada uma com mecânica
   distinta (mín. 2 mecânicas de P4-02b-02..05 usadas no total).
2. Registrar em `src/content/index.ts`; entra automaticamente na rotação do
   Endless e na sequência do Boss Rush.
3. Padrões de bala: reusar os 9 existentes; se precisar de 1 padrão novo, é JSON
   em `src/data/patterns` + registro (dentro do escopo).
4. Balanceamento inicial: mais difícil que os 4 atuais (é o "clímax"), mas
   batível — HP, defeatScore e cadências calibrados em playtest manual.
5. Visual: formas/cores distintas dos outros 4 (config no JSON + shapes
   existentes; sem pipeline de arte novo).

## Requisitos não funcionais

- Zero lógica nova em `src/sim`/`src/systems` (meta da issue).
- Determinismo/replay/verify funcionando com o chefe completo.
- Performance: encontro com partes + adds + balas densas sem alocação no loop.

## Critérios de aceite

- [ ] Run headless completa contra o chefe novo (3 fases até a derrota) em teste.
- [ ] Aparece na rotação do Endless e no Boss Rush.
- [ ] `verifyReplay` ok numa run inteira contra ele.
- [ ] Playtest manual: batível, legível, telegraph claro (registrar impressões
      no PR — feedback pendente: clareza de dano/visual).
- [ ] `docs/ROADMAP.md`: **P4-02 e P4-02b marcados ✅**, contagem de conteúdo
      atualizada (5 chefes).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/data/bosses/<novo>.json` (novo), talvez 1 `src/data/patterns/*.json`
- `src/content/index.ts` (registro)
- `tests/content.test.ts`, novo teste de integração (run completa contra o chefe)
- `docs/ROADMAP.md`, `docs/GAME_DESIGN.md` (contagens)

## Fora de escopo

- Mecânicas inéditas além das de P4-02b-02..05.
- Rebalancear os 4 chefes existentes (só se o playtest revelar quebra grave —
  abrir issue separada).
- Juice/partículas do encontro (P5-01/P5-02).

## Documentação a atualizar

- `docs/ROADMAP.md` (P4-02 ✅, P4-02b ✅, contagem 5 chefes).
- `docs/GAME_DESIGN.md` §Chefes (lista atualizada).

## Riscos técnicos

- Composição de mecânicas nunca testada junta (escudo + adds na mesma fase):
  interações de ordem no tick podem aparecer só aqui — o teste de run completa
  é o detector.
- Dificuldade: clímax vs. feedback de "início mais fácil" — o chefe é late-game,
  mas validar que a rotação do Endless não o entrega cedo demais.

## Sugestão de testes (escrever primeiro)

- Conteúdo: JSON válido, ≥3 fases, ids de padrões/inimigos existentes.
- Integração: simulação roteirizada que derrota cada fase e assevera mecânica
  ativa por fase (partes ⇒ núcleo imune; escudo ⇒ dano bloqueado; teleporte ⇒
  posição muda na cadência).
- Boss Rush inclui o chefe novo na sequência.
- Determinismo: hash estável em duas execuções da run completa.
