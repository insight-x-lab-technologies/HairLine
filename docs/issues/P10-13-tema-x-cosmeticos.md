# [P10-13] Cruzamento tema × cosméticos (regra e implementação)

## Objetivo

Definir e implementar como os **cosméticos** (P6-01) convivem com o **tema** de
apresentação: cosméticos **plenos no tema vetorial**; no tema sprite, um
**conjunto curado** de variantes de arte (evita multiplicar conteúdo). Garantir que
**balas e anel de graze permanecem neon vetorial nos dois temas** (legibilidade).

## Contexto

- Depende de **P10-09** (`SpriteTheme`) e **P10-10** (arte da nave); usa o catálogo
  e o loadout de **P6-01** (`Cosmetics`, forma/cor de nave, cor de tiro, preset de
  trilha).
- Hoje a `GameScene` resolve o loadout uma vez e o `VectorTheme` aplica forma/cor.
  No sprite, "forma/cor" não mapeiam 1:1 para arte — daí a necessidade de uma
  regra explícita.
- Princípio: legibilidade > beleza; e cosméticos **nunca** afetam jogabilidade nem
  o ranking.

## Requisitos funcionais

1. **Regra documentada**: no tema vetorial, todos os cosméticos atuais valem como
   hoje; no tema sprite, define-se um **mapa curado** cosmético→variante de arte
   (ou um fallback: cosmético sem variante de arte ⇒ usa a arte default do tema,
   ou recai no vetorial para aquela peça). Escolher a **menor implementação
   segura** e registrá-la.
2. **Cor de tiro / faíscas**: como hoje, herdam a cor do cosmético; manter nos dois
   temas (tinta sobre sprite ou cor vetorial).
3. **Balas e anel de graze vetoriais neon** nos dois temas — independem do
   cosmético de arte.
4. O **Hangar/preview** reflete honestamente o que o jogador verá **no tema ativo**
   (preview consciente do tema).
5. Sem tocar `src/sim`/`src/systems`; cosmético segue presentation-only e fora do
   `hashState`.

## Requisitos não funcionais

- Determinismo/replay/`hashState()`/leaderboard intactos (regressão testada).
- Não multiplicar conteúdo desnecessariamente (mapa curado + fallback claro).
- Mobile-first no Hangar; preview honesto por tema.
- Sem custo novo no loop (loadout resolvido uma vez, como hoje).

## Critérios de aceite

- [ ] Regra tema×cosmético documentada e implementada com fallback claro.
- [ ] No vetorial, cosméticos funcionam como hoje; no sprite, variantes curadas
      aplicam e o resto cai no fallback definido (manual no `npm run dev`).
- [ ] Cor de tiro/faíscas herdada nos dois temas; balas/anel sempre neon vetorial.
- [ ] Preview do Hangar reflete o tema ativo.
- [ ] Regressão de determinismo: cosmético/tema não mudam `hashState()`/replay.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/Cosmetics.ts` (mapa/regra tema→variante, se ficar lá)
- `src/render/SpriteTheme.ts` / `VectorTheme.ts` (aplicação por tema)
- `src/scenes/HangarScene.ts` + `src/ui/hangar.ts` (preview por tema)
- `src/scenes/GameScene.ts` (resolução do loadout consciente do tema)
- `src/data/cosmetics.json` (se precisar referenciar variantes de arte)

## Fora de escopo

- Novos cosméticos pagos/variantes extras (P7-02).
- Loadout visível no ranking/share (P8).
- Produção da arte das variantes (conteúdo; aqui é a regra + integração).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §cosméticos/Hangar (regra tema×cosmético, preview por
  tema).
- `docs/TECH_DECISIONS.md` (TD curto: como cosmético mapeia por tema, fallback,
  por que não multiplicar conteúdo).
- `docs/ROADMAP.md` (progresso P10-13; com Bloco C concluído, avaliar marcar a
  Fase 10 conforme entregue).

## Riscos técnicos

- Explosão combinatória (cosméticos × temas × peças) — segurar com mapa curado +
  fallback; não exigir arte para todo cosmético.
- Preview desonesto (Hangar mostra vetorial mas jogo é sprite, ou vice-versa) —
  preview consciente do tema ativo.
- Cor de tiro herdada conflitando com balas inimigas (já risco em P6-01) — manter
  curadoria; balas inimigas seguem com sua paleta de perigo.

## Sugestão de testes (escrever primeiro)

- (headless) resolução cosmético→variante por tema: com/sem variante ⇒ fallback
  esperado (função pura).
- Modelo do Hangar consciente do tema (preview correto) — extensão de
  `tests/hangar.test.ts`.
- Regressão de determinismo (reexecutar).
- Aplicação visual é manual — checklist no PR.
