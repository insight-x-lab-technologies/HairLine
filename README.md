# HAIRLINE

**▶ Jogar agora: https://insight-x-lab-technologies.github.io/HairLine**

HAIRLINE é um **bullet hell vertical, mobile-first, jogável com um dedo**, onde
**chegar perto das balas (graze) vira poder** e há um **Desafio Diário com seed
única para todos**. Estética neon vetorial.

## Stack

- **Phaser 4.1.0** (linha "Salusa", fixada exata) · **TypeScript** · **Vite**
- **Vitest** (testes headless) · **PWA** via `vite-plugin-pwa`

## Princípios

- **Determinismo é lei:** lógica em fixed timestep (60 Hz), separada do render —
  mesma seed + mesmos inputs = mesmo resultado em qualquer aparelho.
- **Dados separados de código:** padrões/ondas/inimigos/chefes/estágios em JSON
  (`src/data/`).
- **Simulação headless** (`src/sim/`): testável e re-simulável (replay/anti-cheat).

Detalhes em `docs/` (`ARCHITECTURE.md`, `GAME_DESIGN.md`, `TECH_DECISIONS.md`,
`ROADMAP.md`).

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (Vite)
npm run build      # typecheck + build de produção
npm run preview    # serve o build
npm test           # Vitest (headless)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run format     # Prettier
```

## Deploy

Push para `main` dispara `.github/workflows/deploy.yml`:
**GitHub Pages** (primário, ao vivo na URL acima) e, em seguida, **Cloudflare
Pages** (secundário — só roda quando os secrets `CLOUDFLARE_*` existirem).

Para habilitar o GitHub Pages, defina **Settings → Pages → Source: GitHub
Actions** (uma vez).
