# CLAUDE.md — contrato do agente (HAIRLINE)

> Leia este arquivo no início de cada sessão. 
>
> **Docs de memória (leia antes de implementar uma feature):**
> `docs/ROADMAP.md` (status + IDs por item — abra sessões por `Pn-mm`),
> `docs/PRODUCT_VISION.md`, `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`,
> `docs/TECH_DECISIONS.md`, `docs/TEST_STRATEGY.md`, `docs/01-04*`
>
> **Para criar/ampliar temas de apresentação (arte/áudio):** veja
> `docs/THEME_ASSET_GUIDE.md` (guia de produção de assets — chaves, dimensões,
> formatos, regras de tint/fallback) + `docs/ASSET_CONTRACT.md` (integração por
> entidade).

## O jogo (3 linhas)

HAIRLINE é um **bullet hell vertical, mobile-first, jogável com um dedo**, onde
**chegar perto das balas (graze) vira poder** e há um **Desafio Diário com seed
única para todos**. Estética neon vetorial. Detalhes: `docs/01-escopo-do-projeto.md`.

## Stack (versões fixas)

- **Phaser `4.1.0`** (linha 4.1.x "Salusa") — **fixada exata** no `package.json`.
  ⚠️ Phaser 4 ≠ 3: `setTintFill()` não faz nada; use `setTint()` + `setTintMode()`.
  Não copie tutoriais de Phaser 3 sem ajustar.
- **TypeScript** + **Vite** + **Vitest** (unit/headless).
- **PWA** via `vite-plugin-pwa`. Detalhes: `docs/02-arquitetura-de-referencia.md`.

## Princípios não-negociáveis (violar = retrabalho)

1. **Determinismo é lei.** Lógica em **fixed timestep** (60 Hz), separada do
   render. Mesma seed + mesmos inputs = mesmo resultado em qualquer aparelho.
2. **PROIBIDO `Math.random()`** na lógica. Toda aleatoriedade passa pelo serviço
   `Rng` semeável (`src/services/Rng.ts`). O ESLint barra `Math.random`.
3. **Dados separados de código.** Padrões/ondas/inimigos/chefes/balanceamento em
   JSON em `src/data/` — nunca hardcoded.
4. **Object pooling** obrigatório para balas/inimigos/partículas (Fase 1+).
   Nunca `new` no loop de jogo.
5. **Hitbox ≠ sprite.** Colisão por hitbox lógica pequena, não pelo bounding box.
6. **Simulação tickável headless.** A lógica roda sem render (`src/sim/`), para
   ser testável e re-simulável (replay/anti-cheat).

## Estrutura

`src/{scenes,systems,entities,services,sim,ui,config,data}` + `tests/`.
Veja `docs/02` §4. Um arquivo = uma responsabilidade.

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (Vite)
npm run build        # typecheck + build de produção
npm run preview      # serve o build
npm test             # Vitest (headless)
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier
```

## O que você NÃO deve fazer

- ❌ Usar `Math.random()` em qualquer lógica de jogo.
- ❌ Criar objetos no loop de jogo sem pool (Fase 1+).
- ❌ Hardcodar balanceamento/padrões — vai para JSON em `src/data/`.
- ❌ Quebrar o determinismo (usar `delta` cru na lógica, ordem de update não
  determinística, estado fora da simulação).
- ❌ **"Consertar" um teste alterando o teste** para acomodar um bug. Mudança de
  teste é decisão humana, registrada no commit (`docs/03` §5.4).
- ❌ Misturar render do Phaser dentro de `src/sim/` (a simulação é headless).

## Fluxo

Para cada peça com lógica: **escreva o teste primeiro** (`docs/03`). Specs e docs
de funcionalidade em `docs/`. Testes em `tests/`.
