# [P6-06-02] Arte/hero de qualidade na Home (neon procedural)

## Objetivo

Dar à home uma **identidade visual de nível profissional** — um "hero" /
plano de fundo caprichado com o logotipo HAIRLINE em destaque — **dentro da
estética neon vetorial/procedural** do projeto, sem introduzir pipeline de
assets raster.

## Contexto

- O épico P6-06 pede "qualidade de imagens de nível jogo profissional". A
  `PRODUCT_VISION` define a direção: **neon vetorial/geométrica — formas, glow,
  partículas, procedural — barata de produzir e que parece polida**, evitando
  pipeline de pixel-art/raster.
- Logo, "qualidade profissional" aqui = um hero **procedural** caprichado
  (logotipo neon com glow/camadas, campo de fundo animado mais rico que o
  starfield genérico, talvez vinheta/gradiente e linhas geométricas), **não**
  uma imagem importada.
- ⚠️ **Decisão de arquitetura:** introduzir assets raster (PNG/Webp de hero)
  contraria a visão e exigiria pipeline novo (preload, otimização, PWA cache).
  Se for mesmo desejado, **registrar TD em `docs/TECH_DECISIONS.md`** antes de
  implementar. O default desta issue é **procedural**.
- A `MenuScene` já tem header reservado pela P6-06-01 e usa `neonText`/`shapes`.

## Requisitos funcionais

1. Hero do título: tratar "HAIRLINE" como elemento de destaque (camadas de glow,
   contorno, possivelmente animação sutil de pulso/parallax) — visivelmente
   superior ao `neonText` simples atual.
2. Fundo da home mais rico que o starfield padrão: composição neon procedural
   (gradiente/vinheta + formas geométricas/linhas + partículas suaves),
   coerente com a paleta do jogo.
3. Animação **leve e barata** (sem custo perceptível em celular fraco); usa
   tempo de parede/`delta` (é render puro, fora da simulação — pode).
4. Não obstruir legibilidade dos botões/labels da home (contraste preservado).

## Requisitos não funcionais

- 100% render-side: nada toca a simulação, replay, hash ou ranking.
- Qualquer aleatoriedade decorativa via `Rng` semeado pelo relógio (convenção do
  projeto; ESLint barra `Math.random`).
- Orçamento de performance: animação suave em hardware modesto; degradar com
  elegância (respeitar futura preferência de redução de movimento/flashes —
  P5-05 — se disponível).
- Sem novos assets binários (a menos que TD aprovado).

## Critérios de aceite

- [ ] Home com hero/título e fundo visivelmente mais polidos, mantendo a
      estética neon.
- [ ] Sem assets raster novos (ou, se houver, TD registrado e justificado).
- [ ] Animação não causa queda perceptível de FPS; legibilidade dos controles
      mantida.
- [ ] Verificação manual (`npm run dev`) em retrato e numa janela larga.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/MenuScene.ts` (composição do hero/fundo)
- `src/ui/neonText.ts` / `src/ui/shapes.ts` (helpers de glow/contorno, se
  precisar de reuso)
- Possível novo `src/ui/heroTitle.ts` ou util de fundo (render helper)
- `src/services/Rng.ts` (reuso para decorativo)

## Fora de escopo

- Estrutura/posicionamento dos blocos da home (P6-06-01).
- Rodapé, ícones sociais, doação (P6-06-03/04).
- Tela de carregamento / branding em Boot/Preload.
- Pipeline de assets raster (só com TD aprovado — fora do default).

## Documentação a atualizar

- `docs/ROADMAP.md` (progresso P6-06).
- `docs/TECH_DECISIONS.md` **apenas se** for introduzido asset raster (decisão
  contra a visão atual).

## Riscos técnicos

- "Qualidade profissional" é subjetivo: alinhar com a estética existente em vez
  de buscar realismo raster que o projeto deliberadamente evita.
- Excesso de partículas/animação derruba FPS em celular fraco — manter barato.
- Glow/contraste podem prejudicar legibilidade dos botões; validar contraste.

## Sugestão de testes (escrever primeiro)

- Helpers puros (se extraídos, ex.: geração de pontos/linhas do fundo) testáveis
  e determinísticos sob `Rng` semeado.
- Sanidade: o decorativo não escreve em estado de simulação (a home não cria
  `Simulation`); cobrir por construção/revisão, já que é render.
