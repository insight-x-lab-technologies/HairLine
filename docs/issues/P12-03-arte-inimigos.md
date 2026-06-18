# [P12-03] Arte definitiva dos inimigos — `spr-enemy` (genérico radial, tingível)

## Objetivo

Produzir a **arte ilustrada definitiva do inimigo** (`spr-enemy`) no nível do
mockup v1 (`ref/v1_GamePlay1.png`), substituindo o placeholder atual no mesmo slot
(`public/sprites/enemy.png`). É **um único sprite genérico**, radial/simétrico (lê
em qualquer rotação), **branco/grayscale tingível** pela cor de perigo de cada
inimigo da sim, reusado por **todos os 7 tipos** (a distinção vem da cor + rotação,
não do formato). **A integração já existe (P10-10) — esta issue é arte +
conferência, sem código novo.**

## Contexto

- O tema "Polido" **já está cabeado**: `src/config/themes.ts` registra
  `spr-enemy` → `sprites/enemy.png`, e o `SpriteTheme` (P10-10) já desenha os
  inimigos via **pool de sprites** (`render/SpritePool`, sem `new` no loop), com
  **tint pela cor da sim** e **rotação por `ageTicks`** (ver `docs/ASSET_CONTRACT.md`).
  O `enemy.png` atual é um **placeholder cru** (flor/engrenagem cinza chapada).
  Esta issue troca **só o arquivo** — o slot, o pool, o tint, a rotação e o
  fallback já existem.
- **Um sprite para todos** (`THEME_ASSET_GUIDE §4.4`): há **7 inimigos** (drone,
  sniper, turret, weaver, bomber, lancer, orbiter), mas no tema Polido todos usam o
  **mesmo** `spr-enemy`, escalado ao **diâmetro lógico** (raio×2 ≈ 36–48px) e
  **tingido** pela cor de perigo de cada um. A leitura por tipo apoia-se em
  **cor/tamanho** (e no acento vetorial do Arcade), não em formato — decisão de
  P10-10, mantida aqui.
- **Rotação contínua**: os inimigos giram, então a arte precisa ler **em qualquer
  ângulo** — motivo radial/simétrico, sem "frente" fixa.
- **Regra de cor (`§3.2/§4.4`):** tingido em runtime ⇒ **autorar branco/grayscale
  claro sobre transparência**; matiz embutido brigaria com o tint. No v1 os
  inimigos rosa/magenta são o **tint** sobre a base clara.
- **O que NÃO desenhar** (`§3`): balas, glow, partículas de kill — o engine
  desenha por cima/à parte. Só o **corpo/núcleo** compacto e centrado.

## Requisitos funcionais

1. **Produzir `spr-enemy`** (IA ou humano) conforme `THEME_ASSET_GUIDE §4.4/§10`:
   corpo top-down **radialmente simétrico**, compacto e centrado dentro do círculo
   inscrito do quadrado, **branco/grayscale claro sobre transparência**, autorar em
   alta resolução (128×128) para escalar nítido a ~36–48px.
2. **Drop-in no slot existente**: salvar como `public/sprites/enemy.png` (mesma
   chave `spr-enemy`, mesmo path) — **sem mudar `themes.ts` nem código**. PNG com
   alpha (ou SVG dimensionado).
3. **Tingibilidade comprovada**: a arte tinge limpo nas diversas cores de perigo
   dos 7 inimigos (sem matiz parasita), mantendo contraste e legibilidade.
4. **Lê em qualquer rotação**: validar que, girando (por `ageTicks`), o sprite não
   tem "topo" estranho nem ponto morto — leitura estável em todos os ângulos.
5. **Sem elementos proibidos**: a arte **não** contém balas, glow, partículas nem
   hitbox; o corpo é o único conteúdo.
6. **Legibilidade em densidade e tamanho pequeno**: bold, sem detalhe fino que
   suma a ~40px; distinguível das balas e do fundo (não pode parecer bala nem
   sumir na nebulosa).

## Requisitos não funcionais

- **Presentation-only / determinismo**: arte nunca toca `src/sim`/replay/
  `hashState()`/ranking (trocar o PNG não muda hash/replay).
- **Fallback é lei**: removida/renomeada a chave, os inimigos voltam ao vetorial
  (P10-09) sem erro.
- **Sem `new` no loop**: a integração já usa `SpritePool`; esta issue não altera
  isso (só fornece a textura).
- **hitbox/legibilidade**: o tamanho é o diâmetro lógico da sim (a hitbox manda); a
  arte não pode competir com as balas (legibilidade do perigo > beleza).
- **Mobile-first**: legível a ~40px num celular, em campo denso.

## Critérios de aceite

- [ ] `public/sprites/enemy.png` é a arte definitiva (nível v1), radial/simétrica,
      branco/grayscale, transparente, **sem balas/glow/partículas/hitbox**.
- [ ] Em jogo (tema Polido) os 7 tipos aparecem com a **mesma arte tingida** na cor
      de cada um, girando, legíveis em densidade alta (conferência manual
      `npm run dev`).
- [ ] O tint lê limpo nas várias cores de perigo, sem matiz parasita; o inimigo não
      se confunde com bala nem some no fundo.
- [ ] A leitura é estável em **qualquer rotação** (sem frente/topo destoante).
- [ ] **Nenhuma mudança de código** foi necessária (só o arquivo); o fallback
      vetorial e o `SpritePool` seguem funcionando (smoke test ao remover a chave).
- [ ] `npm run build` verde; peso do PNG razoável; regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `public/sprites/enemy.png` (**substituído** — a entrega principal)
- *(nenhum código)* — `src/config/themes.ts` já registra a chave; `SpriteTheme` +
  `render/SpritePool` + `spriteFallback` já integram tint/rotação/fallback (P10-10)
- *(conferência)* `src/render/SpriteTheme.ts`, `src/render/SpritePool.ts`

## Fora de escopo

- **Arte por tipo de inimigo** (um sprite distinto para drone/sniper/turret/…) —
  o tema usa **um genérico** por design (`§4.4`); arte por tipo seria conteúdo
  futuro, fora desta issue (e exigiria decisão de arquitetura/registro em TD).
- **Arte da nave / chefe / fundo** — P12-02 / P12-04 / P12-05.
- **Bloom/glow** dos inimigos — não pedido em P12-01 (que cobre balas/tiros/motor/
  anel/pulso); o corpo do inimigo não ganha bloom nesta fase.
- **Promover "Polido" a default** — P12-07.

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` (tabela "Estado por peça": inimigos seguem ✅, agora com
  arte **definitiva v1** — nota curta; reforçar "um genérico tingido").
- `docs/ROADMAP.md` (progresso/fechamento de P12-03).
- `docs/TEST_STRATEGY.md` (checklist manual: 7 tipos tingidos, rotação, densidade,
  não-confusão com balas/fundo, escala ~40px).
- *(não abrir TD — sem mudança de arquitetura; pipeline e contrato já em TD-31.)*

## Riscos técnicos

- **Matiz embutido brigando com o tint**: autorar branco/grayscale puro; conferir
  o tint nas várias cores de perigo (`§3.2`).
- **Confusão com bala**: um corpo pequeno e arredondado demais pode parecer bala —
  dar massa/estrutura clara que o distinga (legibilidade do perigo).
- **Ponto morto na rotação**: arte com "frente" lê estranho girando — manter
  radial/simétrico (`§4.4`).
- **Detalhe fino sumindo a 40px**: desenhar bold; testar na escala real.
- **Perda de identidade por tipo**: como é um genérico, a diferença vem da cor —
  garantir que a paleta de perigo dos 7 tipos continua distinguível com a nova arte
  (não escurecer/saturar a base a ponto de achatar as cores).

## Sugestão de testes (escrever primeiro)

- (regressão) suíte verde + determinismo reexecutado (trocar arte não muda hash/
  replay) — trivial por construção, confirmar.
- (smoke/fallback) remover temporariamente a chave/arquivo ⇒ inimigos caem no
  vetorial sem erro; `SpritePool` sem `new` no loop (cobertura de P10-09/10).
- Conferência manual (o grosso): os 7 tipos tingidos em jogo, rotação estável,
  densidade alta, não-confusão com balas/fundo, escala ~40px no celular —
  **checklist no PR** (`TEST_STRATEGY.md`).
