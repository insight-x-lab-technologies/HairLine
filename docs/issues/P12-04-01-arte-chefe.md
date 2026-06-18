# [P12-04-01] Arte definitiva do chefe — `spr-boss` (full-color, drop-in)

## Objetivo

Entregar a **arte definitiva do casco do chefe** (`spr-boss`) no nível do tema
"Polido", confirmando/refinando o asset atual (`public/sprites/boss.png`) contra o
contrato. Diferente da nave/inimigo, o chefe é **full-color (NÃO tingido)** — pinta-
se o visual final. As **mecânicas** (barra de vida, escudo, partes destrutíveis,
telegraph de teleporte, aro de núcleo invulnerável) seguem **vetoriais por cima**
(`§4.5`). **A integração já existe (P10-10) — esta issue é arte + conferência, sem
código novo.** A variação visual por fase (`phaseIndex`) é a **P12-04-02**.

## Contexto

- O tema "Polido" **já está cabeado**: `src/config/themes.ts` registra `spr-boss` →
  `sprites/boss.png`, e o `SpriteTheme.drawBoss` (P10-10) já desenha o corpo como
  sprite (centro = posição da sim, `setDisplaySize(radius*2, radius*2)`, rotação),
  chamando `super.drawBoss(sim)` para as **mecânicas vetoriais por cima**. O
  `boss.png` atual já é **full-color** e razoável (casco mecânico com glow) — pode
  ser **promovido a definitivo** se passar o contrato, ou refinado.
- **Full-color, NÃO tingível** (`§3.2/§4.5`): ao contrário de nave/inimigo, o
  chefe **não** recebe `setTint` — autorar o visual final em cor. (Cuidado: não
  introduzir `setTint` no chefe.)
- **O que NÃO desenhar / deixar espaço** (`§3/§4.5`): barra de vida, anel de escudo,
  pods de partes, telegraph de teleporte, aro de núcleo invulnerável, olho/núcleo
  pulsante — tudo isso o engine desenha **vetorial por cima**. A arte é só o
  **casco/chassi**; manter a **área central** não muito ocupada (o núcleo/olho fica
  ali) e deixar margem para os overlays não competirem com o casco.
- **Rotação lenta**: o casco gira devagar — desenhar para ler enquanto vira
  (simétrico ajuda).
- Há **5 chefes** (warden, spinner, gunner, vortex, colossus), mas todos usam o
  **mesmo** `spr-boss` no Polido (as mecânicas próprias aparecem nos overlays
  vetoriais). A variação por **fase** é tratada à parte (P12-04-02).

## Requisitos funcionais

1. **Confirmar/produzir `spr-boss`** conforme `THEME_ASSET_GUIDE §4.5/§10`: casco
   top-down menacing, simétrico, **full-color**, área central simples, fundo
   transparente, autorar em alta resolução (256×256) → footprint ~88–108px (diâmetro
   lógico). Se o `boss.png` atual atender, **promovê-lo a definitivo** (registrar a
   decisão); senão, refinar/substituir no mesmo slot.
2. **Drop-in no slot existente**: `public/sprites/boss.png` (chave `spr-boss`, mesmo
   path) — **sem mudar `themes.ts` nem código**.
3. **Sem tint**: garantir que o chefe é mostrado **as-is** (sem `setTint`); a cor é
   da arte, não do JSON.
4. **Espaço para os overlays**: validar que barra/escudo/partes/telegraph/núcleo
   vetoriais aparecem legíveis **sobre** o casco, sem o casco encobri-los nem
   duplicá-los (a arte não pinta versões falsas dessas mecânicas).
5. **Lê girando**: validar a leitura com a rotação lenta aplicada (sem topo
   destoante).

## Requisitos não funcionais

- **Presentation-only / determinismo**: arte nunca toca `src/sim`/replay/
  `hashState()`/ranking (trocar o PNG não muda hash/replay).
- **Fallback é lei**: removida a chave, o chefe volta ao casco **vetorial** (P10-06)
  sem erro.
- **Legibilidade das regras > beleza**: o casco não pode disputar com balas nem
  encobrir as mecânicas vetoriais (princípio sagrado).
- **Mobile-first**: legível a ~100px num celular, com os overlays por cima.
- **Peso**: PNG comprimido (o tema carrega sob demanda, fora do precache PWA).

## Critérios de aceite

- [ ] `public/sprites/boss.png` é a arte definitiva (full-color, transparente,
      simétrica, centro simples), promovida ou refinada, sem mecânicas pintadas.
- [ ] Em jogo (tema Polido) o chefe aparece como sprite **sem tint**, girando, com
      barra/escudo/partes/telegraph/núcleo vetoriais legíveis por cima
      (conferência manual `npm run dev`, cobrir os 5 chefes).
- [ ] **Nenhuma mudança de código** foi necessária (só o arquivo / a decisão de
      promover); o fallback vetorial segue funcionando ao remover a chave.
- [ ] `npm run build` verde; peso razoável; regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `public/sprites/boss.png` (**confirmado/substituído** — a entrega principal)
- *(nenhum código)* — `src/config/themes.ts` já registra a chave; `SpriteTheme.
  drawBoss` já integra corpo+rotação+overlays vetoriais (P10-10)
- *(conferência)* `src/render/SpriteTheme.ts`

## Fora de escopo

- **Variação visual por fase** (`phaseIndex` → cor/quadro do corpo) — **P12-04-02**
  (a nuance pendente de P10-10; é código, não arte).
- **Arte distinta por chefe** (warden/spinner/…): todos usam um `spr-boss`; arte por
  chefe seria conteúdo futuro + decisão de arquitetura/TD, fora desta issue.
- **Arte da nave / inimigos / fundo** — P12-02 / P12-03 / P12-05.
- **Bloom** — P12-01 (não cobre o casco do chefe).
- **Promover "Polido" a default** — P12-07.

## Documentação a atualizar

- `docs/ASSET_CONTRACT.md` (tabela "Estado por peça": chefe ✅ com arte
  **definitiva v1**; reforçar full-color/sem-tint e overlays vetoriais).
- `docs/ROADMAP.md` (progresso P12-04 — parte arte).
- `docs/TEST_STRATEGY.md` (checklist manual: 5 chefes, overlays legíveis sobre o
  casco, rotação, escala ~100px).
- *(não abrir TD — sem mudança de arquitetura; contrato já em TD-31.)*

## Riscos técnicos

- **Aplicar tint por engano**: o chefe é full-color — não tingir (regra distinta de
  nave/inimigo).
- **Casco encobrindo/duplicando mecânicas**: não pintar barra/escudo/partes/núcleo
  na arte; deixar margem e centro simples para os overlays vetoriais.
- **Centro ocupado demais**: o núcleo/olho pulsante vetorial vive no centro —
  manter a área central limpa (`§4.5`).
- **Leitura girando**: casco assimétrico lê estranho na rotação — preferir
  simetria.
- **Peso do PNG**: arte muito pesada incha o download sob demanda — comprimir.

## Sugestão de testes (escrever primeiro)

- (regressão) suíte verde + determinismo reexecutado (trocar arte não muda hash/
  replay) — trivial por construção, confirmar.
- (smoke/fallback) remover a chave/arquivo ⇒ chefe cai no casco vetorial (P10-06)
  sem erro.
- Conferência manual (o grosso): os 5 chefes em jogo, overlays vetoriais legíveis
  sobre o casco, rotação, escala — **checklist no PR** (`TEST_STRATEGY.md`).
