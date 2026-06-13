# Backend do ranking diário — Cloudflare Worker + KV

> Estado: **preparado, não implantado.** Funciona localmente sem ele (ranking
> em localStorage). Quando houver conta Cloudflare, siga os passos abaixo.

## Arquitetura

- Cliente: `RemoteLeaderboard` (`src/services/LeaderboardService.ts`), ativado
  quando a variável de build `VITE_LEADERBOARD_URL` aponta para o Worker.
- Sem a variável, usa `LocalLeaderboard` (localStorage) — o jogo funciona
  offline e o ranking some entre dispositivos.
- Identidade: `PlayerIdentity` gera um id anônimo + apelido (sem cadastro).
- Anti-cheat v1: validação de plausibilidade no Worker + verificação de replay
  por re-simulação no cliente (`verifyReplay`). Re-simular no servidor (a sim é
  portável) é evolução futura.

## Endpoints

- `GET  /api/leaderboard?day=YYYY-MM-DD&n=10` → top N (JSON).
- `POST /api/leaderboard` body `{ dayKey, name, score, id }` → grava (dedupe por id).

## Deploy (quando tiver conta)

```bash
cd worker
npx wrangler kv namespace create LEADERBOARD   # copie o id para wrangler.jsonc
npx wrangler deploy                            # publica o Worker
```

Depois, no build do app, defina a URL do Worker:

```bash
# .env.local na raiz do projeto
VITE_LEADERBOARD_URL=https://hairline-leaderboard.<sua-conta>.workers.dev
```

`npm run build` passa a usar o ranking remoto automaticamente.

## Observações

- CORS liberado (`*`) — é um ranking público simples.
- Limites: nome ≤ 16 chars, score ≤ 1e8, top ≤ 50, 100 entradas/dia por chave KV.
- A decisão de plataforma (Cloudflare) é consistente com o deploy do app
  (Cloudflare Pages, `docs/deploy-cloudflare.md`).
