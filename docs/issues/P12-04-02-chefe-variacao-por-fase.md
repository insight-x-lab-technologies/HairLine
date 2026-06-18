# [P12-04-02] Variação visual do corpo do chefe por fase (`phaseIndex`) no sprite

## Objetivo

Fechar a **nuance pendente de P10-10**: no tema "Polido", o **casco do chefe não
muda entre as fases**, enquanto no Arcade ele **clareia por fase** ("fica mais
perigoso" óbvio). Esta issue faz o `SpriteTheme.drawBoss` **reagir ao
`boss.phaseIndex`** com uma variação visual legível do corpo — **sem exigir arte
nova** e sem "lavar" o casco full-color. **Render-only ⇒ determinismo intacto.**

## Contexto

- No **Arcade**, `VectorTheme` deriva a cor do casco de `phaseIndex`:
  `lightenColor(baseColor, boss.phaseIndex * 38)` — a cada fase o chefe clareia e
  as pontas do núcleo estelar crescem (`src/render/VectorTheme.ts`, `drawBoss`/
  `drawBossBody`). É a leitura "fica mais perigoso" do GAME_DESIGN.
- No **Polido**, `SpriteTheme.drawBoss` só posiciona/escala/gira o sprite e delega
  as mecânicas a `super.drawBoss` — **o corpo é estático entre fases**. O
  `docs/ASSET_CONTRACT.md` registra isso explicitamente: "o mapeamento `phaseIndex`
  → variação visual (cor/quadro) do corpo ainda **não** foi feito — quando entrar, é
  só ler `boss.phaseIndex` no `drawBoss`".
- `boss.phaseIndex` **já é exposto** pela sim e já usado no Arcade — **nenhuma
  mudança de sim/replay/hash**; é só apresentação.
- **Desafio:** o chefe é **full-color (não tingido)** — um `setTint` por fase
  "sujaria" a arte. Precisa de um tratamento que intensifique o perigo
  **preservando** o casco (ex.: overlay/glow emissivo que cresce por fase; leve
  shift de brilho; pulso/aura mais intenso). Evitar exigir um sprite por fase
  (multiplicaria arte/peso).

## Requisitos funcionais

1. **Ler `boss.phaseIndex` no `SpriteTheme.drawBoss`** e aplicar uma **variação
   visual progressiva** do corpo do chefe a cada fase, espelhando a intenção do
   Arcade ("mais perigoso por fase") sem código de sim.
2. **Preservar a arte full-color**: a variação **não** pode descaracterizar/lavar o
   casco. **Decisão a registrar na issue** (recomendado): um **overlay/aura emissiva
   aditiva** (ou leve aumento de brilho) que **intensifica com `phaseIndex`**, em vez
   de `setTint` direto sobre o casco. Alternativa mais cara (sprite/quadro por fase)
   fica fora salvo decisão explícita.
3. **Consistência com o Arcade**: a sensação de escalada deve ser comparável entre
   os temas (não precisa ser idêntica; precisa "ler igual" — fica mais quente/claro/
   intenso por fase).
4. **Derivação pura quando aplicável**: se houver cálculo de parâmetros por fase
   (ex.: intensidade/alpha/escala do overlay a partir de `phaseIndex`), extrair como
   **função pura testável headless** (no espírito de `shipVisual`/`spriteFallback`).
5. **Fallback intacto**: sem o sprite do chefe (chave ausente), o caminho vetorial
   (que já varia por fase) segue valendo — esta issue só afeta o ramo sprite.
6. **Alinhar com bloom (P12-01) se já presente**: se o helper de FX/bloom existir, a
   aura por fase pode reusá-lo (qualidade baixa ⇒ degradar para um realce mínimo,
   não quebrar). Se P12-01 não estiver pronto, usar o caminho de glow disponível
   (camadas de alpha) sem bloquear.

## Requisitos não funcionais

- **Presentation-only / determinismo**: lê `boss.phaseIndex` (já existente); nada
  entra em sim/replay/`hashState()`/ranking. Regressão de determinismo verde.
- **Perf**: sem alocação por frame; o overlay/aura reusa GameObjects criados no
  `init` (sem `new` no loop). Em qualidade baixa (P12-01-01, se disponível), a
  variação degrada barato.
- **Legibilidade**: a variação não pode encobrir as mecânicas vetoriais (barra/
  escudo/partes/telegraph/núcleo) nem competir com as balas.
- **Sem arte nova**: a solução padrão não exige assets adicionais (full-color
  preservado).

## Critérios de aceite

- [ ] No tema Polido, o corpo do chefe **muda visivelmente a cada fase** (mais
      perigoso), espelhando a intenção do Arcade (conferência manual `npm run dev`,
      cobrir um chefe multi-fase, ex.: colossus 3 fases).
- [ ] A arte full-color **não** é descaracterizada/lavada; a abordagem escolhida
      (overlay/aura/brilho, **não** `setTint` direto) está registrada na issue/PR.
- [ ] As mecânicas vetoriais seguem legíveis por cima; nada compete com as balas.
- [ ] Se houver cálculo por fase, há **função pura testada headless**
      (`phaseIndex` → parâmetros da variação).
- [ ] Fallback vetorial intacto (chave ausente ⇒ caminho vetorial que já varia).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes;
      regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `src/render/SpriteTheme.ts` (`drawBoss`: ler `phaseIndex`, aplicar overlay/aura
  por fase; GameObject do overlay criado no `init`)
- `src/render/` (possível função pura nova, ex.: `bossPhaseVisual.ts`, ou helper
  em `spriteFallback`/`shipVisual`-style — derivação `phaseIndex`→parâmetros)
- `src/ui/fx.ts` (consumido **se** P12-01 já existir — bloom/glow da aura)
- `tests/` (função pura de variação por fase, se houver; regressão de determinismo)

## Fora de escopo

- **Arte do casco do chefe** — P12-04-01.
- **Sprite/quadro por fase** (arte distinta por fase) — fora salvo decisão
  explícita (multiplicaria arte/peso); a abordagem padrão é overlay/aura sem arte.
- **Variação por chefe** (warden vs colossus) — não é objetivo; a variação é por
  **fase**, com um único `spr-boss`.
- **Mudar a sim** para expor algo novo — `phaseIndex` já basta.
- **Bloom geral do gameplay** — P12-01 (aqui só se reusa o helper, se disponível).

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` (tabela "Estado por peça": chefe — `phaseIndex`→variação
  **✅** no sprite; descrever a abordagem escolhida).
- `docs/GAME_DESIGN.md` (chefe: "fica mais perigoso por fase" agora vale **nos dois
  temas**).
- `docs/ARCHITECTURE.md` (`src/render/`: `SpriteTheme.drawBoss` varia o corpo por
  `phaseIndex` via overlay/aura; função pura se houver).
- `docs/ROADMAP.md` (progresso P12-04 — parte variação por fase; **fechar P12-04**
  ao concluir 01+02).
- `docs/TECH_DECISIONS.md`: **TD curto** apenas se a abordagem for decisão
  estrutural reusável (ex.: padrão de "overlay emissivo por estado" para sprites);
  caso contrário, nota no PR basta.

## Riscos técnicos

- **`setTint` lavando o full-color**: não tingir o casco direto; usar overlay/aura
  aditiva ou brilho — registrar a decisão.
- **Variação fraca/imperceptível**: calibrar para a escalada "ler" como no Arcade;
  conferir num chefe de 3 fases.
- **Overlay encobrindo mecânicas**: manter a aura atrás/contida; barra/escudo/partes/
  telegraph/núcleo seguem legíveis.
- **Acoplar a P12-01**: se o bloom não estiver pronto, ter um caminho de glow
  próprio (camadas de alpha) para não bloquear; degradar em qualidade baixa.
- **`new` no loop**: criar o overlay no `init`, reusar no `draw`.

## Sugestão de testes (escrever primeiro)

- (headless) função pura `phaseIndex` → parâmetros da variação (intensidade/alpha/
  escala), monotônica e determinística (sem `Math.random`), se existir.
- (headless/defensivo) `drawBoss` não lança sem pipeline de FX (jsdom) — degrada.
- (regressão) determinismo reexecutado: variação por fase não muda hash/replay.
- Conferência manual: chefe multi-fase escalando visivelmente, arte preservada,
  mecânicas legíveis, paridade de sensação com o Arcade — **checklist no PR**
  (`TEST_STRATEGY.md`).
