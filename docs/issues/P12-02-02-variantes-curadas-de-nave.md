# [P12-02-02] Variantes curadas de nave — `spr-ship-ship-prism` / `-comet` (opcional)

## Objetivo

Produzir as **silhuetas curadas** dos cosméticos de nave Prisma e Cometa
(`spr-ship-ship-prism`, `spr-ship-ship-comet`) — arte alternativa **opcional** que
dá a cada nave cosmética um formato próprio no tema Polido, em vez de reusar a
silhueta base tingida. Drop-in nos slots já registrados; valida a **cadeia de
fallback** de TD-33. **Opcional por design** (o ROADMAP marca "+ variantes" como
opcional) — sem ela, todas as naves usam a base tingida, sem prejuízo. **Arte +
conferência, sem código novo.**

## Contexto

- O mockup do Hangar (`ref/v1_Hangar.png`) mostra **três silhuetas distintas** —
  Padrão (base), **Prisma** (mais cristalina/angular) e **Cometa** (mais
  aerodinâmica) — cada uma com sua cor. A **cor** sempre vem do tint do cosmético;
  só a **silhueta** distinta exige arte curada (TD-33).
- **A máquina já existe**: `src/config/themes.ts` registra
  `spr-ship-ship-default`, `spr-ship-ship-prism`, `spr-ship-ship-comet` (hoje
  apontando para placeholders), e `resolveShipSprite` (`render/spriteFallback`,
  puro, testado) resolve a cadeia: **(1)** variante curada `spr-ship-<id>` →
  **(2)** `spr-ship` tingida → **(3)** silhueta vetorial. Esta issue só troca os
  **arquivos** das variantes — **sem código**.
- **Cosmético ≠ classe de nave**: estes ids (`ship-default`/`ship-prism`/
  `ship-comet`) são **cosméticos** (P6-01, só aparência), resolvidos no render e
  **fora da sim** — diferentes das **classes** (P6-04, regras de jogo). A arte aqui
  nunca toca a simulação.
- **Mesmas specs da base** (`THEME_ASSET_GUIDE §4.3`): footprint 64px, nariz para
  cima, **branco/grayscale claro tingível**, sem chama/glow/anel/hitbox. Manter
  **quase-branco** para o tint do cosmético ler limpo.

## Requisitos funcionais

1. **Produzir as variantes** com silhuetas **distintas** entre si e da base
   (Prisma angular/cristalina; Cometa aerodinâmica/alongada), fiéis ao espírito do
   mockup do Hangar, cada uma em alta resolução (256×256) → footprint 64px.
2. **Drop-in nos slots existentes**: `public/sprites/ship-ship-prism.png` e
   `ship-ship-comet.png` (chaves `spr-ship-ship-prism` / `spr-ship-ship-comet`,
   já no manifesto) — **sem mudar `themes.ts` nem código**.
3. **Tingibilidade**: cada variante tinge limpo na cor do respectivo cosmético
   (e em qualquer cor, já que o cosmético separa forma de cor).
4. **Cadeia de fallback comprovada**: com a variante presente, o Hangar/gameplay
   mostram a silhueta curada; ao remover o arquivo, caem na base `spr-ship` tingida
   (não no vetorial), confirmando TD-33.
5. **Decisão sobre `ship-default`**: a variante `spr-ship-ship-default` deve
   **reapontar/casar com a nave base** (`spr-ship`) — registrar se ela é mantida
   como cópia da base ou se o default usa direto `spr-ship` (evitar arte
   redundante/divergente para o cosmético default).
6. **Disciplina de footprint**: todas as variantes ocupam a mesma massa visual de
   64px — silhueta diferente, **não** tamanho diferente (justiça da hitbox).

## Requisitos não funcionais

- **Presentation-only / determinismo**: cosmético resolve render, nunca entra em
  sim/replay/`hashState()`/ranking (≠ classe de nave, TD-25).
- **Fallback é lei**: ausência de variante ⇒ base tingida; nunca exigir arte por
  cosmético (sem explosão combinatória — TD-33).
- **Quase-branco**: manter as variantes claras para o tint do cosmético funcionar.
- **Paridade preview×jogo**: a silhueta no Hangar = a silhueta em jogo (mesma
  textura resolvida pela mesma cadeia).
- **Peso**: PNGs comprimidos; variantes opcionais não devem inchar o tema.

## Critérios de aceite

- [ ] `ship-ship-prism.png` e `ship-ship-comet.png` são silhuetas curadas distintas
      (entre si e da base), branco/grayscale, 64px, transparentes, sem chama/glow/
      anel/hitbox.
- [ ] No Hangar e em jogo, selecionar Prisma/Cometa mostra a silhueta curada
      tingida na cor do cosmético (conferência manual `npm run dev`).
- [ ] Removendo um arquivo de variante, aquele cosmético cai na **base `spr-ship`
      tingida** (não no vetorial) — cadeia de TD-33 confirmada (smoke test).
- [ ] A relação `ship-default` ↔ base está decidida e registrada (sem arte
      redundante/divergente para o default).
- [ ] **Nenhuma mudança de código** necessária (só arquivos); `resolveShipSprite`
      e os testes existentes seguem verdes.
- [ ] `npm test`, `npm run build` verdes; regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `public/sprites/ship-ship-prism.png`, `public/sprites/ship-ship-comet.png`
  (**substituídos** — entrega principal)
- `public/sprites/ship-ship-default.png` (decidir: casar com a base ou remover a
  chave e usar `spr-ship` direto)
- *(nenhum código)* — manifesto e `resolveShipSprite` já existem (TD-33)
- *(conferência)* `src/render/spriteFallback.ts`, `src/scenes/HangarScene.ts`

## Fora de escopo

- **Arte da nave base** — P12-02-01 (pré-requisito recomendado: variantes filhas
  da mesma linguagem visual da base).
- **Novos cosméticos de nave** (além de prism/comet) — fora desta fase; a máquina
  comporta, mas é conteúdo, não esta issue.
- **Inimigos / chefe / fundo** — P12-03/04/05.
- **Carregar variantes nas cenas de menu fora do tema Polido** — integração da Fase
  11 (preview do Hangar, P11-08-02).
- **Bloom** — P12-01.

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` (nota: variantes curadas prism/comet com arte
  definitiva; cadeia de fallback TD-33 exercitada de ponta a ponta).
- `docs/ROADMAP.md` (progresso P12-02 — parte variantes; **fechar P12-02** ao
  concluir 01+02).
- `docs/TEST_STRATEGY.md` (checklist manual: seleção de variantes no Hangar/jogo,
  tint, fallback variante→base).

## Riscos técnicos

- **Variantes coloridas demais**: se não forem quase-brancas, o tint do cosmético
  fica "lavado" — autorar claras (`§4.3`).
- **Silhuetas pouco distintas**: variantes que mal diferem da base não justificam a
  arte — buscar formas reconhecíveis (Prisma cristalina, Cometa alongada).
- **`ship-default` divergente**: manter o default coerente com a base para o
  cosmético default não parecer "outra nave"; decidir e registrar.
- **Footprint inconsistente**: variante "maior" sugere hitbox maior — manter 64px.
- **Esforço opcional consumindo escopo**: é opcional; se o tempo apertar, a base
  (P12-02-01) já entrega o tema jogável — não bloquear P12-03+ por isto.

## Sugestão de testes (escrever primeiro)

- (headless) `spriteFallback`/`resolveShipSprite`: a cadeia variante→base→vetorial
  já é coberta (TD-33); confirmar verde com as variantes presentes/ausentes.
- (regressão) determinismo reexecutado: variantes não mudam hash/replay (trivial).
- Conferência manual (o grosso): selecionar Prisma/Cometa no Hangar e em jogo, tint,
  remover variante ⇒ cai na base tingida — **checklist no PR** (`TEST_STRATEGY.md`).
