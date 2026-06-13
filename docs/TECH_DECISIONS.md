# TECH_DECISIONS — HAIRLINE (ADR resumido)

> Doc de memória: decisões técnicas tomadas e o porquê, para novas sessões não
> reabrirem o que já foi resolvido. Formato leve de ADR. Status: ✅ vigente.

## TD-01 — Phaser 4.1.0 fixado exato ✅
Engine 2D web padrão; renderer node-based bom para milhares de balas. **Fixar a
versão exata** (`package.json`, sem `^`). ⚠️ Phaser 4 ≠ 3: `setTintFill()` não
faz nada; usar `setTint()` + `setTintMode()`.

## TD-02 — TypeScript estrito + Vite + Vitest ✅
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` etc. Pega bugs cedo e
ancora geração agêntica. Vite p/ dev/build/PWA; Vitest p/ testes headless.

## TD-03 — Determinismo é lei ✅
Fixed timestep 60 Hz, lógica headless separável do render, `hashState()`
reproduzível. Habilita Diário justo + anti-cheat por re-simulação.

## TD-04 — PRNG mulberry32 (`Rng`) ✅
Simples, rápido, estado de 32 bits, qualidade suficiente. **Proibido
`Math.random`** (ESLint barra). Valores golden fixados em teste.

## TD-05 — Dados separados de código ✅
Padrões/inimigos/chefes/ondas/balanceamento em **JSON** (`src/data/`), lidos via
`src/content`. Permite criar conteúdo sem tocar em sistemas.

## TD-06 — Padrões de bala = emitters declarativos ✅
Em vez de DSL/script, cada padrão é uma lista de emitters parametrizados
(`ring/fan/aimed` + `angleStepDeg/accel/speedStep/radiusStep/aimOffsetDeg`).
Cobre muita variedade com pouco código. Um **editor** (P4-06) viria por cima
deste formato, não o substitui.

## TD-07 — Pooling obrigatório ✅
`BulletPool`/`EnemyPool` pré-alocados, free-list LIFO, varredura por índice
(ordem estável = determinismo). Nunca `new` no loop.

## TD-08 — Render por `Graphics` redesenhado por frame ✅
Cenas leem os pools e redesenham (sem criar GameObjects no loop). Formas por tipo
(`ui/shapes`) + glow. Simples e suficiente; otimização fica para a Fase 5.

## TD-09 — Áudio procedural (Web Audio), sem assets ✅
SFX e trilha sintetizados (osciladores+envelopes). Combina com a estética neon e
evita pipeline de áudio. Lógica "que som tocar" é pura (`AudioCues`, testável);
o backend (`AudioService`) é apresentação. Mute persistido.

## TD-10 — Plataforma de hospedagem: Cloudflare ✅
Deploy do PWA em **Cloudflare Pages** (preparado, não deployado). Ranking em
**Cloudflare Workers + KV** (`worker/`, preparado). Escolha consistente entre app
e backend. (Supabase foi a alternativa considerada e descartada.)

## TD-11 — `Leaderboard` assíncrono + cliente intercambiável ✅
Interface `Promise`-based; `LocalLeaderboard` (offline/default) e
`RemoteLeaderboard` (fetch). Troca por `VITE_LEADERBOARD_URL`, sem mexer nos
chamadores.

## TD-12 — Identidade anônima leve ✅
`PlayerIdentity`: id estável gerado localmente (via `Rng`, sem `Math.random`) +
apelido editável. Sem cadastro. Só para distinguir no ranking.

## TD-13 — Anti-cheat v1 por re-simulação ✅
O replay grava inputs+seed+mode+**mods**; `verifyReplay` re-roda a sim e confere
hash/score. Plausibilidade simples no Worker. Re-sim no servidor = futuro.

## TD-14 — Seeds: dia (UTC) e semana (ISO) ✅
`DailySeed` (Diário) e `Modifiers.weeklySeed` (Evento Semanal) derivam de
data/semana via FNV-1a → mesmas para todos. `RunMods` plano e serializável.

## TD-15 — Persistência local ✅
`SaveService` (recorde), `PlayerIdentity`, mute, ranking local — tudo em
localStorage com fallback em memória e store injetável (testável).

## TD-16 — Scripts dev expõem rede (Tailscale) ✅
`scripts/run.sh` usa `--host` + `server.allowedHosts: true` (Vite) para acesso
via LAN/Tailscale; não-bloqueante (setsid + pidfile); `--strictPort` 8080.

## TD-17 — Fases de chefe data-driven + mecânicas compostas (P4-02b) ✅
`BossDef.phases: BossPhaseDef[]` substitui `phasePatternIds` (sem suporte duplo —
o jogo não lançou). Cada fase declara `patternId` + `untilHpPct` e, opcionalmente,
`shield` / `adds` / `parts` / `movement`. Decisões fechadas:
- **Transição de fase = função pura do HP**, dentro de `Boss.onHit` (mesmo ponto
  de antes, preserva hash); `BossSystem` reconcilia as mecânicas no `update`
  seguinte quando `phaseIndex` muda (1 tick depois, determinístico).
- **`BossSystem` recebe um `Rng` semeado PRÓPRIO e isolado** (derivado da seed da
  run), usado só pelo teleporte. Não toca o stream principal da simulação ⇒
  chefes sem `movement` não consomem aleatoriedade e runs antigas de chefes
  `sweep` ficam byte-idênticas. Os adds usam **offsets fixos** (sem Rng).
- **Contrato de colisão ampliado**: `resolveShotsVsBossSystem(shots, sys, state)`
  resolve, por tiro e em ordem fixa, partes → escudo → núcleo (o antigo
  `resolveShotsVsBoss(shots, boss)` segue para o caminho só-núcleo).
- **Hash**: escudo (HP), partes (vivas/soma de HP) e ciclo de teleporte
  (telegraph + posição) entram no checksum — replay/anti-cheat cobrem a luta.

## Decisões em aberto (revisitar quando necessário)
- Formato compacto de replay (bitpacking de inputs) — hoje é array por tick.
- Atlas único de sprites vs `Graphics` — só se a performance exigir (Fase 5).
- Re-simulação de replay no servidor (anti-cheat v2).
