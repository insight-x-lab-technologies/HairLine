# Contrato de asset por entidade — tema "Polido" (P10-10)

> Como integrar arte raster ao `SpriteTheme` **uma peça por vez** sem quebrar o
> jogo. A nave é a primeira peça (feita); **chefe e inimigos repetem este mesmo
> fluxo**. Produzir a arte é tarefa de conteúdo; o código é só integração — um
> placeholder valida o slot e a arte final entra depois pelo mesmo lugar.

## Princípios

- **Fallback é lei.** Sem o asset registrado, a categoria volta ao **vetorial**
  (P10-09) sem erro. Adicionar arte = registrar uma chave; remover = deletar a
  chave. O jogo nunca fica inconsistente.
- **Apresentação pura.** Sprites só LEEM o estado autoritativo da sim. Nada toca
  `src/sim`/`src/systems`, `hashState()`, replay ou ranking. Determinismo intacto.
- **Hitbox ≠ sprite (§3.5).** O ponto de hitbox e o anel de graze permanecem
  **vetoriais por cima** do sprite. Balas e mecânicas legíveis também seguem
  vetoriais — a arte não pode esconder a hitbox nem competir com as balas.
- **Sem `new` no loop (TD-07).** Sprites vêm de pool pré-alocado
  (`render/SpritePool`) ou são únicos criados no `init`.
- **Peso/PWA por tema.** Assets ficam em `public/sprites/`, no manifesto do tema
  em `config/themes`, e são **excluídos do precache** (`vite.config` →
  `globIgnores: sprites/**`). O tema arcade não baixa nada.

## O contrato (4 campos)

Para cada entidade que ganha arte, defina:

1. **Chave de atlas/textura.** Convenção `spr-<categoria>` (`render/spriteFallback`):
   `spr-ship`, `spr-enemy`, `spr-boss`. Registrar a chave no manifesto do tema
   habilita a categoria; até lá, vetorial. A disponibilidade em runtime é o cache
   do Phaser (`textures.exists`).
2. **Origem / centro.** O sprite é ancorado no **centro** (origin 0.5 — default do
   Phaser) e posicionado em **(x, y) da sim**. Centro do sprite = posição lógica.
   Nunca ancorar em canto: desalinha sprite × hitbox.
3. **Escala de referência.** A arte é escalada para um **footprint de referência**
   em unidades virtuais, independente da resolução nativa:
   - **Nave:** `SHIP_SPRITE_SIZE` (64px) — casa com o glow da silhueta vetorial.
   - **Inimigo / chefe:** `setDisplaySize(radius*2, radius*2)` — diâmetro lógico
     da sim (a hitbox manda no tamanho).
4. **Mapeamento estado → variação visual.** Estados já existem na sim; a arte
   reage a eles por **função pura** (sem Phaser, testável):
   - **Nave:** `render/shipVisual.ts` → `shipVisualState({ focus, invulnerable,
     timeMs })` devolve `{ scale, alpha, engineScaleY }` (encolhe no Foco, pisca em
     i-frames, pulsa a chama). **Compartilhada por vetorial e sprite** ⇒ feel
     idêntico entre temas.
   - **Inimigo:** tint pela cor da sim, rotação por `ageTicks`.
   - **Chefe (futuro):** `phaseIndex` → variação (cor/quadro); escudo/partes/
     telegraph/barra continuam **vetoriais** (legibilidade das regras).

## Fluxo para integrar uma peça (repetível)

1. **Arte → `public/sprites/<nome>`** (placeholder branco aceitável; tint aplica a
   cor). Para tint funcionar, a base é clara/branca.
2. **Registrar a chave** no `assets` do tema "polido" em `src/config/themes.ts`
   (`{ key: 'spr-<cat>', url: 'sprites/...', type: 'image' }`). O `PreloadScene` já
   carrega só o manifesto do tema ativo (carga condicional).
3. **Montar o GameObject** no `SpriteTheme`: sprite único no `makeShip`/`init`
   (nave/chefe) ou via `SpritePool` (inimigos). Centro = posição da sim, escala de
   referência, tint do cosmético quando aplicável.
4. **Mapear estados** pela função pura da categoria; manter hitbox/anel/mecânicas
   vetoriais por cima.
5. **Fallback:** garantir que, sem a chave, `super.<draw…>()` desenha o vetorial.
6. **Testes:** função pura de mapeamento (headless) + fallback (P10-09). Alinhamento/
   feel/peso são checklist manual no PR.

## Estado por peça

| Categoria | Chave       | Arte         | Mapeamento de estados            |
| --------- | ----------- | ------------ | -------------------------------- |
| Nave      | `spr-ship`  | placeholder  | `shipVisual` (Foco/i-frames/chama) ✅ |
| Chefe     | `spr-boss`  | —            | `phaseIndex` (pendente)          |
| Inimigos  | `spr-enemy` | —            | tint/rotação (pendente)          |

Ver `docs/TECH_DECISIONS.md` TD-31 (SpriteTheme + fallback + PWA por tema) e
`docs/ARCHITECTURE.md` (`src/render/`).
