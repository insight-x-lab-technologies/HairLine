# [P12-05] Arte definitiva do fundo (parallax raster) — `spr-bg-far/nebula/near`

## Objetivo

Produzir as **três camadas ilustradas definitivas do fundo** do tema "Polido"
(`spr-bg-far`, `spr-bg-nebula`, `spr-bg-near`) no nível do mockup v1
(`ref/v1_GamePlay1.png` — nebulosa rica teal/azul), substituindo os placeholders
atuais nos mesmos slots. Cada camada é **720×1280, transparente, baixo contraste e
verticalmente tileável**, rolando em **parallax** (6 / 16 / 38 px/s). **A máquina já
existe (P10-11) — esta issue é arte + conferência, sem código novo.** **Regra
todas-ou-nenhuma:** sem as três, o fundo cai no procedural (P10-07).

## Contexto

- O tema "Polido" **já está cabeado**: `src/config/themes.ts` registra
  `spr-bg-far/nebula/near` → `sprites/bg-*.png`, e o `SpriteTheme` (P10-11) já rola
  `TileSprite`s por camada via `render/parallaxBackground` (função pura, offset
  testado headless), com velocidades em `src/data/polishedBackground.json`
  (`far=6`, `nebula=16`, `near=38` px/s). Os arquivos atuais são **placeholders**
  (poucos blobs pastel na nebulosa; pontinhos esparsos no near). Esta issue troca
  **só os arquivos** — slots, parallax, fallback e dimensões já existem.
- **Dimensões corretas hoje** (confirmado): os três PNGs são **720×1280 RGBA**.
  Manter exatamente esse tamanho (usados em escala 1:1, não são escalados como os
  sprites de entidade).
- **Todas-ou-nenhuma** (`§4.6`): as três camadas **devem existir juntas**; faltando
  qualquer uma, o tema cai no **fundo procedural** (P10-07) — não há mistura
  parcial. Entregar as três num lote.
- **Baixo contraste é requisito de jogo, não estética** (`§4.6` + GAME_DESIGN): o
  v1 tem nebulosa rica, mas **balas, anel de graze e nave são sempre desenhados por
  cima** e não podem se perder no fundo. Evitar brancos fortes, ruído de alta
  frequência e clutter na área de jogo.
- **Transparência**: as três empilham **sobre a cor base do espaço** que o engine
  pinta por baixo — fundo transparente, sem cor opaca embutida (senão escondem as
  camadas de baixo).

## Requisitos funcionais

1. **Produzir as três camadas** (IA ou humano) conforme `THEME_ASSET_GUIDE §4.6/
   §10`, cada uma **720×1280**, PNG **transparente**, **baixo contraste**:
   - `spr-bg-far` (6 px/s, "mais profunda"): poeira estelar fina e fraca.
   - `spr-bg-nebula` (16 px/s, meio): poucas nuvens de brilho suaves e de baixo
     contraste, **afastadas das bordas topo/base** para a emenda ficar invisível.
   - `spr-bg-near` (38 px/s, "mais próxima"): estrelas **esparsas**, maiores e mais
     brilhantes, com leve glow.
2. **Tileável verticalmente**: cada textura deve **emendar topo↔base sem costura**
   (rola para baixo, embrulhada pela própria altura de 1280). Truque seguro: motivo
   em grade de 80px (80 divide 720 e 1280), ou qualquer imagem genuinamente
   vertical-seamless.
3. **Drop-in nos slots existentes**: salvar como `public/sprites/bg-far.png`,
   `bg-nebula.png`, `bg-near.png` (mesmas chaves/paths) — **sem mudar `themes.ts`,
   `polishedBackground.json` nem código**.
4. **Lote completo**: entregar as **três** juntas (todas-ou-nenhuma); não registrar
   uma sem as outras.
5. **Legibilidade comprovada**: validar em jogo que balas/anel/nave permanecem
   nítidos sobre o fundo, **em movimento** (parallax) e em densidade alta.

## Requisitos não funcionais

- **Presentation-only / determinismo**: arte nunca toca `src/sim`/replay/
  `hashState()`/ranking (trocar PNGs não muda hash/replay).
- **Fallback é lei**: faltando qualquer camada, cai no procedural (P10-07) sem erro
  — não criar dependência dura nem registrar lote incompleto.
- **Legibilidade do perigo > beleza**: contraste deliberadamente baixo na área de
  jogo; balas/anel/nave sempre legíveis por cima.
- **Peso/PWA**: assets só do tema ativo e fora do precache; ainda assim comprimir —
  a nebulosa atual já é a mais pesada (~340KB), cuidar para não inflar demais
  (degradê suave comprime bem; evitar ruído fino que estoura o PNG).
- **Mobile-first**: bonito e legível em retrato, em telas pequenas, em movimento.

## Critérios de aceite

- [ ] As três camadas definitivas (nível v1) estão em `public/sprites/bg-*.png`,
      cada uma **720×1280**, transparente, baixo contraste.
- [ ] Cada camada **emenda verticalmente sem costura** (conferir o wrap em
      movimento — sem "salto" na virada).
- [ ] Em jogo (tema Polido) o parallax 6/16/38 px/s lê com profundidade e **balas/
      anel/nave permanecem legíveis** em densidade alta (conferência manual
      `npm run dev`).
- [ ] **Nenhuma mudança de código** foi necessária (só os arquivos); removendo uma
      camada, o fundo cai no **procedural** sem erro (smoke test).
- [ ] `npm run build` verde; peso das três sob controle; regressão de determinismo
      verde.

## Arquivos/módulos provavelmente afetados

- `public/sprites/bg-far.png`, `bg-nebula.png`, `bg-near.png` (**substituídos** — a
  entrega principal)
- *(nenhum código)* — `src/config/themes.ts`, `src/data/polishedBackground.json`,
  `render/parallaxBackground` e `SpriteTheme` já integram (P10-11)
- *(conferência)* `src/render/SpriteTheme.ts`, `src/render/parallaxBackground.ts`

## Fora de escopo

- **Mudar velocidades/camadas de parallax** (`polishedBackground.json`) — é tuning
  separado; aqui só a arte nas velocidades já definidas.
- **Fundo do menu/Home** — a Home tem seu próprio fundo procedural (P6-06/Fase 11);
  esta issue é o fundo de **gameplay** do tema Polido.
- **Fundo procedural (Arcade)** — P10-07, inalterado; o Arcade não usa estes assets.
- **Arte da nave / inimigos / chefe** — P12-02 / P12-03 / P12-04.
- **Promover "Polido" a default** — P12-07.

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` / `THEME_ASSET_GUIDE` (nota: fundo raster com arte
  **definitiva v1**; reforçar todas-ou-nenhuma + baixo contraste + seamless).
- `docs/ROADMAP.md` (progresso/fechamento de P12-05).
- `docs/TEST_STRATEGY.md` (checklist manual: seam em movimento, legibilidade de
  balas/anel/nave sobre o fundo, parallax, peso).
- *(não abrir TD — sem mudança de arquitetura; máquina e contrato já em TD-31 e
  P10-11.)*

## Riscos técnicos

- **Costura visível na virada**: a emenda topo↔base é o erro clássico — seguir a
  grade de 80px ou validar o wrap em movimento; manter blobs da nebulosa longe das
  bordas (`§4.6`).
- **Contraste alto "comendo" as balas**: tentação de capricho — manter baixo
  contraste na área de jogo; conferir com campo denso de balas por cima.
- **Fundo opaco escondendo camadas**: manter transparência real (sem cor de fundo
  embutida) para empilhar sobre a cor base.
- **Peso do PNG (nebulosa)**: ruído/detalhe fino estoura o arquivo — preferir
  degradês suaves; conferir o tamanho final.
- **Lote incompleto**: registrar/entregar só uma ou duas camadas cai no procedural
  e confunde — entregar as três juntas.

## Sugestão de testes (escrever primeiro)

- (headless) `parallaxBackground`: offset/wrap por camada já é coberto (P10-11) —
  confirmar verde; nada muda no código.
- (regressão) determinismo reexecutado: trocar arte não muda hash/replay (trivial).
- (smoke/fallback) remover uma camada ⇒ fundo cai no procedural (P10-07) sem erro.
- Conferência manual (o grosso): seam em movimento, parallax 6/16/38, legibilidade
  de balas/anel/nave sobre o fundo em densidade alta, peso — **checklist no PR**
  (`TEST_STRATEGY.md`).
