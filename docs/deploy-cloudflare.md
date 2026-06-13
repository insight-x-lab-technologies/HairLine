# Deploy — Cloudflare Pages

> Estado: **preparado, não ativado.** A conta Cloudflare ainda será criada.
> Nada aqui dispara deploy sozinho até os secrets existirem.

O jogo é um PWA estático: `npm run build` gera `dist/`, e o Cloudflare Pages
serve esse diretório. Há **dois caminhos**; escolha um quando tiver a conta.

## Caminho A — CI por GitHub Actions (já preparado)

Usa `.github/workflows/deploy.yml` + `wrangler.toml` (projeto `hairline`,
saída `dist`).

Passos quando a conta existir:

1. Crie a conta no Cloudflare e um projeto **Pages** chamado `hairline`
   (modo "Direct Upload" / via Wrangler).
2. Gere um **API Token** com permissão `Account → Cloudflare Pages → Edit`.
3. No repositório GitHub, em *Settings → Secrets and variables → Actions*,
   crie:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Faça push na branch `main`. O workflow builda e publica via
   `wrangler pages deploy`.

Teste local opcional (precisa do token exportado no shell):

```bash
npx wrangler pages deploy dist --project-name=hairline
```

## Caminho B — Integração Git do próprio Pages (sem Actions)

No dashboard do Cloudflare Pages, "Connect to Git" e configure:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 22 (variável de ambiente `NODE_VERSION=22`)

Nesse caminho o `deploy.yml` é dispensável (pode removê-lo); o Pages builda a
cada push automaticamente.

## Observações

- `public/_headers` define cache: assets com hash são imutáveis; `sw.js`,
  `index.html` e o manifest ficam `no-cache` para o PWA atualizar.
- O `start_url`/`scope` do manifest e o `base: './'` do Vite usam caminhos
  relativos, então funciona tanto na raiz do domínio quanto em subcaminho.
- A decisão de plataforma de **deploy** (Cloudflare Pages) é independente da
  decisão do **backend de ranking** (Supabase vs Cloudflare), ainda em aberto
  em `docs/02` §9.
