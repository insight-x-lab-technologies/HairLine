# [P4-02b-04] Partes destrutíveis do chefe

## Objetivo

Adicionar **partes destrutíveis**: sub-alvos com HP e hitbox próprios, presos ao
corpo do chefe, que precisam ser destruídos antes do núcleo ficar vulnerável.
Dá ao jogador escolha de alvo e ao chefe uma silhueta/leitura nova.

## Contexto

- Depende de **P4-02b-01**. Combina com (mas não depende de) escudo e adds.
- `CollisionSystem` hoje conhece um único alvo de chefe (círculo único).
- Aplicar ao **vortex** (pods orbitais que emitem padrões — tema combina) na
  fase 1, núcleo vulnerável só na fase final.

## Requisitos funcionais

1. Campo opcional por fase:
   `parts: [{ offsetXPx, offsetYPx, radiusPx, hp, patternId? }]` — posição
   relativa ao centro do chefe (acompanha o movimento).
2. Enquanto houver parte viva na fase, o núcleo é **invulnerável** (tiros no
   núcleo não causam dano; tiros nas partes causam).
3. Cada parte pode emitir seu próprio padrão (`patternId`, idade = `phaseAge`),
   a partir da posição da parte.
4. Parte destruída para de emitir, some do render e pontua
   (`scorePerPartDefeat` no JSON do chefe ou da parte).
5. Estado das partes (vivas/HP) entra no `hashState()` e fica legível pelo render.
6. Render (GameScene): partes desenhadas como formas neon presas ao chefe,
   feedback de dano/destruição; núcleo com indicação de invulnerável (mesma
   linguagem visual do escudo de P4-02b-02, se já existir).
7. `vortex.json` migrado: fase 1 com 2 pods, fase 2 núcleo exposto.

## Requisitos não funcionais

- Partes pré-alocadas na entrada do chefe (array fixo, sem `new` no loop).
- Hitbox por círculo lógico (parte ≠ sprite), como o resto do jogo.
- Headless; ordem de colisão determinística (partes em ordem de índice).

## Critérios de aceite

- [ ] Headless: tiros no núcleo com partes vivas não causam dano; destruir todas
      ⇒ núcleo vulnerável.
- [ ] Partes acompanham o vaivém do chefe (posição = centro + offset).
- [ ] Parte destruída para de emitir e pontua uma única vez.
- [ ] Hash inclui partes; `verifyReplay` ok numa run com vortex.
- [ ] Visual: partes e estado do núcleo legíveis no `npm run dev`.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts`, `src/content/index.ts` (schema `parts` + validação)
- `src/systems/BossSystem.ts` (estado das partes, emissão, posição)
- `src/systems/CollisionSystem.ts` (tiro↔parte antes de tiro↔núcleo)
- `src/sim/Simulation.ts` (fiação/score/hash)
- `src/scenes/GameScene.ts` (render das partes)
- `src/data/bosses/vortex.json`
- `tests/BossSystem.test.ts`, `tests/CollisionSystem.test.ts`, `tests/Simulation.test.ts`

## Fora de escopo

- Partes com movimento próprio (órbita animada independente do corpo) — offsets
  fixos por fase bastam nesta issue.
- Partes que se regeneram.
- Aplicar partes a outros chefes além do vortex.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Chefes (campo `parts`, regra de invulnerabilidade).
- `docs/ROADMAP.md` (progresso P4-02b).
- `docs/TECH_DECISIONS.md` se `CollisionSystem` mudar de contrato (lista de
  alvos em vez de alvo único).

## Riscos técnicos

- É a issue mais invasiva: toca `CollisionSystem` (caminho quente). Cuidar de
  custo por tick (poucas partes, loop simples) e da ordem determinística.
- Interação com pulso refletor: pulso limpa **balas**, não deve danificar partes
  (manter regra atual; declarar no teste).
- Duplo-crédito de score se a parte morrer e for atingida no mesmo tick.

## Sugestão de testes (escrever primeiro)

- Colisão: tiro dentro do raio da parte ⇒ dano na parte, não no núcleo.
- Núcleo invulnerável até a última parte cair (inclusive dano no mesmo tick).
- Emissão por parte usa a posição da parte (offset + vaivém).
- Score de parte concedido exatamente uma vez.
- Determinismo/replay com vortex completo (fase de partes → núcleo → derrota).
