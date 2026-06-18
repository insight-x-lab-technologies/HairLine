# [P11-01-02] Tipografia — adotar fonte display + evoluir `neonText` para ler tokens

## Objetivo

Trocar o `fontFamily: 'monospace'` (programmer-art) por uma **tipografia de jogo**
adequada às telas repaginadas da Fase 11, e evoluir `ui/neonText` para ler os
**tokens** (P11-01-01) — tamanho/peso/cor por papel — **mantendo sua assinatura**
para não quebrar os dezenas de chamadores. **Nada toca a simulação.**

## Contexto

- Decisão macro da Fase 11: **ficar no Phaser 4.1** (canvas, sem DOM/CSS para a
  UI). O texto da UI é desenhado pelo Phaser; o "look monospace" atual é o maior
  sintoma de "programmer-art" nos mockups `ref/v0_*.jpeg` vs. `ref/v1_*.png`.
- Depende de **P11-01-01** (tokens): a tipografia consome os **slots de tamanho/
  peso** e as **cores por papel** já definidos lá.
- `ui/neonText.neonText(scene, x, y, text, size?, color?)` retorna
  `Phaser.GameObjects.Text` e é usado amplamente. **Preservar a assinatura** é o
  caminho de menor raio de impacto — internamente passa a usar a nova `fontFamily`
  e defaults vindos de tokens.
- **Decisão de caminho (recomendada nesta SDD):** adotar uma **WebFont display
  auto-hospedada via `@font-face`** no `index.html` + garantia de carregamento
  antes do primeiro render de texto (canvas só rasteriza a fonte se ela já estiver
  carregada). Isso mantém `neonText` retornando `Text` (raio de impacto mínimo). A
  alternativa **BitmapText** (nitidez/perf superiores) **muda o tipo de retorno** e
  exige gerar atlas de fonte + reescrever todos os chamadores ⇒ fica como
  **otimização futura**, não nesta issue. A SDD deve registrar a escolha final.
- **Licença/peso (contexto p/ a escolha):** fonte **OFL/livre, auto-hospedada**
  (sem CDN externo — PWA/offline + sem request de rede em runtime). Candidatas de
  display geométrica/techno coerentes com o neon: ex. *Orbitron*, *Rajdhani*,
  *Exo 2*, *Audiowide* (todas OFL) — escolher **1 display** para título/HUD e
  decidir se o **corpo** usa a mesma família (peso menor) ou uma segunda mais
  legível em tamanho pequeno. Manter o nº de pesos baixo (1–2) pelo peso do bundle.

## Requisitos funcionais

1. **Adotar a fonte** auto-hospedada: arquivo(s) da fonte no projeto, `@font-face`
   no `index.html` (ou CSS importado), `font-display` adequado. Sem CDN externo.
2. **Garantir carregamento antes do render**: usar `document.fonts.ready` /
   `FontFaceSet.load()` (ou o loader equivalente) no boot/preload, de modo que as
   cenas só desenhem texto com a fonte já disponível — **sem FOUT** (texto piscando
   de monospace para a fonte). Definir o ponto de espera (ex.: `BootScene`/
   `PreloadScene`) e o fallback se a fonte falhar (cair numa família segura sem
   quebrar o layout).
3. **`neonText` lê tokens**: `fontFamily` passa a ser a nova fonte; `size`/`color`
   default vêm dos tokens (P11-01-01). **Assinatura preservada**
   (`neonText(scene, x, y, text, size?, color?)` continua válida); chamadores
   existentes não mudam. Opcional: aceitar um "papel" tipográfico (ex.: `display`/
   `body`/`label`) que resolve tamanho/peso pelos tokens — **sem** tornar
   obrigatório.
4. **Pesos/estilos**: expor no mínimo o peso de display (título) e um peso de
   corpo; mapear aos slots de tipografia dos tokens.
5. **Cobertura de glifos**: garantir acentuação PT-BR (ç, ã, é, …) e os símbolos
   já usados na UI (∞ ◆ ◎ ★ 🔒 etc., quando vierem de texto) — onde a fonte não
   cobrir um glifo, definir fallback explícito.

## Requisitos não funcionais

- **Determinismo intacto**: tipografia é presentation-only; nada entra em
  `src/sim`/replay/`hashState()`/ranking.
- **Sem FOUT/CLS perceptível**: o texto não deve trocar de fonte/saltar após o
  load. Esperar a fonte no boot é aceitável (tela de carregamento curta).
- **Peso do bundle**: subconjunto/poucos pesos; fonte auto-hospedada **dentro** do
  precache PWA (UI vale em todos os temas — diferente dos assets de gameplay, que
  ficam fora do precache). Manter o acréscimo de KB modesto.
- **Mobile-first / legibilidade**: tamanhos legíveis em retrato; respeitar
  safe-areas (`hudLayout`) — não regredir o que já cabe na tela.

## Critérios de aceite

- [ ] A UI usa a nova fonte display (não mais `monospace`) em Menu/Home e nos
      textos de `neonText` (conferência manual `npm run dev`).
- [ ] Sem FOUT: o texto já aparece na fonte certa (a cena espera
      `document.fonts.ready`/loader antes de desenhar); falha de carga ⇒ fallback
      seguro sem layout quebrado.
- [ ] `neonText` mantém a assinatura atual; chamadores existentes compilam e
      renderizam sem alteração; defaults de tamanho/cor vêm dos tokens.
- [ ] Acentos PT-BR e símbolos de UI usados renderizam corretamente (ou caem em
      fallback definido).
- [ ] A fonte é auto-hospedada (sem request a CDN) e entra no precache PWA.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay
      (trivial; tipografia não toca a sim).

## Arquivos/módulos provavelmente afetados

- `index.html` (`@font-face` / `<link>` da fonte auto-hospedada + `font-display`)
- `public/fonts/` ou `src/assets/fonts/` (arquivo(s) da fonte — novo)
- `src/ui/neonText.ts` (fontFamily nova + defaults via tokens; assinatura mantida)
- `src/scenes/BootScene.ts`/`PreloadScene.ts` (espera de `document.fonts.ready`/
  loader antes do primeiro texto)
- `vite.config.*` / config do `vite-plugin-pwa` (garantir a fonte no precache)
- `tests/neonText`/loader de fonte (na medida do testável em jsdom)

## Fora de escopo

- **BitmapText / atlas de fonte** (otimização futura; mudaria o tipo de retorno e
  exigiria reescrever chamadores).
- Tokens em si (P11-01-01) — aqui só se **consome**.
- Componentes `ui/panel`/`ui/button`/iconografia (P11-03/04/05) e a repaginação
  das telas (P11-06+), que aplicarão a fonte já adotada.
- Internacionalização/escolha de múltiplos alfabetos (P8-04 i18n).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/neonText` lê tokens + fonte auto-hospedada;
  espera de fonte no boot; fonte no precache PWA, distinta dos assets de gameplay).
- `docs/GAME_DESIGN.md` (nota curta sobre a tipografia do toolkit de UI, se
  couber).
- `docs/ROADMAP.md` (progresso de P11-01 — parte tipografia; fechar o item ao
  concluir 01+02).
- `docs/TECH_DECISIONS.md`: registrar a escolha **WebFont vs BitmapText** e
  licença/auto-hospedagem **se** for considerada decisão estrutural (TD curto);
  pode aguardar e ser consolidada no TD da Fase 11 aberto em P11-06.

## Riscos técnicos

- **FOUT/CLS**: desenhar antes da fonte carregar ⇒ texto monospace piscando e
  reflow. Mitigar esperando `document.fonts.ready`/`FontFaceSet.load()` no boot;
  ter fallback.
- **jsdom/headless**: `document.fonts` pode não existir nos testes — o loader
  precisa ser defensivo (no-op/resolved quando a API falta) para não quebrar o
  Vitest.
- **Licença**: usar **só** fontes OFL/livres, auto-hospedadas; evitar Google Fonts
  por CDN (rede em runtime, privacidade, offline).
- **Peso do bundle**: muitos pesos/estilos incham o PWA; limitar a 1–2 pesos e
  subconjunto Latin (+ símbolos necessários).
- **Cobertura de glifos**: emojis/símbolos (🔒, ⚡, ∞) podem não existir na fonte
  display — manter fallback de sistema para esses ou migrá-los para a iconografia
  vetorial (P11-05) depois.
- **Quebrar chamadores**: trocar para BitmapText acidentalmente muda o tipo de
  retorno — manter `Text` nesta issue.

## Sugestão de testes (escrever primeiro)

- (headless/jsdom) o loader de fonte resolve mesmo quando `document.fonts` está
  ausente (defensivo) e não lança.
- (headless) `neonText` usa os defaults de tamanho/cor vindos dos tokens (sem
  passar args) — verificável pelo estilo aplicado ao objeto retornado.
- (headless) `neonText` mantém a assinatura: chamadas com/sem `size`/`color`
  produzem o estilo esperado.
- Regressão de determinismo (reexecutar): tipografia não muda hash/replay.
- Ausência de FOUT, legibilidade e fonte correta nas telas: **manual** (checklist
  no PR, `TEST_STRATEGY.md`).
