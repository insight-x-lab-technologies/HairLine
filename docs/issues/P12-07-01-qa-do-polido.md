# [P12-07-01] Integração & QA do "Polido" — conferência completa (gate antes do default)

## Objetivo

Fazer a **conferência integrada e final do tema "Polido"** com todas as peças da
Fase 12 montadas (bloom P12-01; arte de nave/inimigos/chefe/fundo P12-02..05;
samples P12-06): paridade com o mockup v1, **FPS no celular**, **peso/PWA**,
**legibilidade** (balas/anel/nave sobre o fundo, em densidade) e uma checagem
**qualitativa de daltonismo**. Produz um **`TEST_REPORT.md`** com o veredito e a
lista de ajustes, servindo de **gate** para promover o "Polido" a default
(P12-07-02). **Conferência/QA — sem feature nova.**

## Contexto

- A Fase 12 é "produção de arte + tuning de FX"; quando 01–06 estão prontas, o
  "Polido" deixa de ser parcial. Falta a **passada holística** que o ROADMAP pede
  em P12-07 antes de torná-lo default.
- O tema é **presentation-only** (TD-28/29/30/31): trocar/ativar tema **não muda**
  sim/replay/`hashState()`/Diário/ranking — a regressão de determinismo é parte do
  veredito, mas o risco é de **UX** (FPS, peso, legibilidade), não de justiça.
- **Dependências de acessibilidade/perf ainda abertas:** P5-05 (daltonismo/redução
  de flashes/alto contraste) e P5-06 (orçamento de frame/modo de qualidade) são ⬜.
  Logo a checagem de **daltonismo é qualitativa** (sinalizar achados para P5-05) e a
  de **FPS** se apoia no **toggle de qualidade** (P12-01-01) e no Arcade como
  alternativa — não há modo daltônico/perf completo a exigir aqui.
- Convém rodar em **celular real** (acesso via `scripts/run.sh` com `--host`/
  Tailscale) além do desktop.

## Requisitos funcionais

1. **Paridade com o v1**: comparar gameplay no "Polido" com `ref/v1_GamePlay1.png`
   (nebulosa, nave/inimigos/chefe ilustrados, bloom em balas/tiros/motor/anel/
   pulso) e registrar divergências relevantes.
2. **Legibilidade (crítico)**: confirmar que balas, anel de graze e nave permanecem
   nítidos sobre o fundo raster, **em densidade alta** e **com bloom ligado**; que a
   arte de inimigos não se confunde com balas; que os overlays vetoriais do chefe
   (barra/escudo/partes/telegraph/núcleo) leem sobre o casco.
3. **FPS no celular**: medir/observar o FPS em celular real em cenas densas
   (chefe + muitas balas + partículas), em **qualidade alta e baixa** (P12-01-01),
   e registrar se "baixa" recupera frame de forma aceitável.
4. **Peso/PWA**: confirmar no build que `sprites/**` e `audio/**` ficam **fora do
   precache** (`globIgnores`), que o Arcade **não baixa** assets do Polido, e
   estimar o peso de primeira carga do Polido (download sob demanda).
5. **Daltonismo (qualitativo)**: avaliar as cores de perigo/anel/tiro sob simulação
   de daltonismo (ferramenta de browser), registrando riscos para **P5-05** — sem
   implementar modo daltônico aqui.
6. **Regressão de determinismo**: reexecutar a suíte e confirmar mesma seed/inputs ⇒
   mesmo `hashState()`/replay com o tema ativo.
7. **`TEST_REPORT.md`**: gravar o relatório (ambiente, checklist, FPS observado,
   peso, screenshots/notas de divergência, veredito **go/no-go** para o default e
   lista de ajustes — apontando o que é P5-05/P5-06).

## Requisitos não funcionais

- **Sem feature/lógica nova**: é conferência; ajustes pontuais de tuning (alpha de
  bloom, contraste de fundo) podem ser feitos, mas mudanças grandes viram issue.
- **Determinismo intacto**: nada da QA pode alterar sim/replay/hash.
- **Reprodutível**: o checklist do `TEST_REPORT.md` deve poder ser refeito por outra
  pessoa (passos, dispositivo, seed usada).

## Critérios de aceite

- [ ] Existe `TEST_REPORT.md` com ambiente, checklist completo (paridade,
      legibilidade, FPS alta×baixa, peso/PWA, daltonismo qualitativo, determinismo)
      e **veredito go/no-go** para o default.
- [ ] Legibilidade confirmada em densidade alta com bloom ligado (balas/anel/nave/
      inimigos/chefe), ou divergências registradas com ajuste proposto.
- [ ] Peso/PWA conferido: `sprites/**`+`audio/**` fora do precache; Arcade não baixa
      assets do Polido (`npm run build` + inspeção do precache).
- [ ] FPS observado em celular real em alta e baixa qualidade, registrado.
- [ ] Achados de daltonismo/perf encaminhados para P5-05/P5-06 (não implementados
      aqui).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes;
      regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `TEST_REPORT.md` (ou `docs/TEST_REPORT.md`) — **a entrega principal**
- *(ajustes pontuais de tuning, se necessários)* `src/data/effects.json`
  (bloom/contraste), `src/data/polishedBackground.json` — só tuning, não lógica
- *(conferência, sem alterar)* `src/render/SpriteTheme.ts`, `vite.config.ts`
  (`globIgnores`), `src/config/themes.ts`

## Fora de escopo

- **Promover o "Polido" a default** — P12-07-02 (este QA é o **gate**).
- **Implementar daltonismo/alto contraste/redução de flashes** — P5-05.
- **Modo de qualidade/orçamento de frame completo** — P5-06 (aqui só se usa o toggle
  de P12-01-01 e se registram achados).
- **Produzir arte/áudio faltante** — P12-02..06 (este QA assume-as prontas; o que
  faltar cai no fallback e é registrado).

## Documentação a atualizar

- `TEST_REPORT.md` (novo — o artefato).
- `docs/TEST_STRATEGY.md` (incorporar o checklist manual do "Polido" como
  referência reutilizável).
- `docs/ROADMAP.md` (progresso P12-07 — parte QA; nota do veredito).

## Riscos técnicos

- **Bloom × legibilidade**: bloom forte pode fundir balas — ajustar alpha/raio
  (tuning) ou registrar para P12-01-02; legibilidade vence.
- **Fundo competindo com balas**: contraste alto demais — baixar (tuning) ou abrir
  ajuste de arte (P12-05).
- **FPS ruim no celular**: se "baixa" não recupera, é insumo forte para P5-06 e para
  **não** promover a default ainda (veredito no-go).
- **Asset faltante mascarado pelo fallback**: conferir que cada peça final aparece
  (não está caindo silenciosamente no vetorial/synth por chave errada).
- **Daltonismo**: cores de perigo/tiro próximas podem confundir — registrar para
  P5-05, sem bloquear.

## Sugestão de testes (escrever primeiro)

- (regressão) suíte verde + determinismo reexecutado com o tema Polido ativo.
- (build) inspeção do precache: sem `.png` de `sprites/` nem `.wav` de `audio/`.
- Conferência manual (o grosso): o checklist do `TEST_REPORT.md` em desktop **e**
  celular real (paridade, legibilidade densa, FPS alta×baixa, peso, daltonismo).
