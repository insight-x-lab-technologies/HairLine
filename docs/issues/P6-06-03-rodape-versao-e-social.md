# [P6-06-03] Rodapé da Home: versão, copyright e compartilhamento social

## Objetivo

Preencher a faixa de rodapé da home (reservada na P6-06-01) com: **versão do
jogo**, **copyright "© Insight X Lab Game Studio"** e uma fileira **discreta de
ícones** que compartilham o jogo em redes sociais (WhatsApp, Telegram, TikTok,
Instagram, etc.).

## Contexto

- O épico P6-06 pede ícones pequenos e discretos na base, com links de
  compartilhamento, versão do jogo e copyright para **Insight X Lab Game
  Studio**.
- Hoje não há fonte única de versão (`package.json` está em `0.0.0`). Definir uma
  **fonte canônica de versão** exposta ao app (ex.: via `import.meta.env` /
  constante de build a partir do `package.json`), para o rodapé exibir.
- Há serviços de compartilhamento de **resultado** (`ShareCard`/`ShareImage`),
  mas isto é diferente: compartilhar **o jogo** (URL + frase curta), não uma run.
- Compartilhamento na web: usar **deep links de share por rede** (ex.:
  `https://wa.me/?text=…`, `https://t.me/share/url?url=…`) e/ou a **Web Share
  API** (`navigator.share`) quando disponível (ótimo em mobile). TikTok/Instagram
  não têm URL de share-intent confiável de texto/URL na web — tratar com
  pragmatismo (abrir o perfil/app ou usar Web Share como fallback); decidir e
  documentar por rede.
- Padrão do projeto: **modelo puro testável** em `src/ui/*`; a cena só desenha e
  abre o link.

## Requisitos funcionais

1. **Versão**: expor a versão do jogo de uma fonte única (derivada do
   `package.json`) e exibi-la discretamente no rodapé. (Bump do `package.json`
   para uma versão real, ex.: `0.1.0`, é razoável aqui.)
2. **Copyright**: "© {ano} Insight X Lab Game Studio" no rodapé.
3. **Compartilhamento**: módulo puro `src/ui/socialLinks.ts` (ou
   `src/services/Share.ts`) que, dada a URL do jogo + frase, produz os **alvos de
   share** por rede (label/ícone + URL de intent), e uma função para abrir
   (Web Share API quando houver; senão a URL de intent em nova aba).
4. Renderizar a fileira de ícones **pequenos e discretos** no rodapé (WhatsApp,
   Telegram, TikTok, Instagram e os que fizerem sentido), tocáveis, respeitando
   safe-areas.
5. URL canônica do jogo configurável (constante/env) — não hardcodar espalhado.

## Requisitos não funcionais

- Modelo de share **puro e testável** (URLs montadas e codificadas
  corretamente, `encodeURIComponent`); a cena é casca de desenho.
- Abrir links externos com segurança (`noopener,noreferrer`) e degradar quando
  `navigator.share`/`window.open` não existirem (headless/SSR-safe).
- Ícones discretos: não competir com a ação primária (jogar); respeitar
  safe-areas e alvos tocáveis mínimos.
- Sem dependências novas pesadas; ícones via formas/`shapes` ou glifos, coerente
  com a estética neon (sem pipeline raster).

## Critérios de aceite

- [ ] Versão exibida no rodapé vem de fonte única derivada do `package.json`.
- [ ] Copyright "© Insight X Lab Game Studio" presente.
- [ ] `socialLinks.ts` testado: cada rede produz a URL de intent correta e
      codificada para uma URL+texto de exemplo.
- [ ] Tocar um ícone usa Web Share API quando disponível, senão abre a URL de
      intent com `noopener`.
- [ ] Comportamento por rede sem share-intent web (TikTok/Instagram) definido e
      documentado (perfil/app ou Web Share fallback).
- [ ] Verificação manual (`npm run dev`): rodapé discreto, ícones funcionam.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/ui/socialLinks.ts` (novo — alvos de share puros) ou
  `src/services/Share.ts`
- `src/scenes/MenuScene.ts` (desenhar o rodapé na faixa reservada)
- `src/config/*` (constante de URL do jogo; exposição da versão)
- `package.json` / `vite.config.ts` (versão real + injeção via env, se preciso)
- `tests/socialLinks.test.ts` (novo)

## Fora de escopo

- Links de doação Ko-fi / Buy Me a Coffee (P6-06-04 — reusará o helper de abrir
  link externo).
- Compartilhar **resultado de run** (já coberto por `ShareCard`/`ShareImage`).
- Open Graph / meta tags de preview do site (poderia virar item próprio).
- Contas/handles reais das redes (a definir com o usuário; usar placeholder
  configurável se ainda não houver).

## Documentação a atualizar

- `docs/ROADMAP.md` (progresso P6-06).
- `docs/ARCHITECTURE.md` (fonte única de versão; helper de links externos).
- `docs/TECH_DECISIONS.md` (TD curto: estratégia de share por rede — Web Share
  API vs deep links; tratamento de redes sem intent web).

## Riscos técnicos

- TikTok/Instagram não oferecem share-intent web confiável para texto/URL —
  expectativa precisa ser ajustada (perfil/app ou Web Share).
- Handles/URLs sociais ainda não definidos — não bloquear: tornar configurável.
- `navigator.share` exige contexto seguro (HTTPS) e gesto do usuário — garantir
  fallback e não quebrar em desktop/headless.
- Versão via env: garantir que o build injeta corretamente (sem vazar em
  `0.0.0`).

## Sugestão de testes (escrever primeiro)

- `socialLinks.ts`: para URL `https://hairline.example` + texto "Jogue HAIRLINE",
  WhatsApp ⇒ `https://wa.me/?text=...` com texto+URL codificados; Telegram ⇒
  `https://t.me/share/url?url=...&text=...`.
- Caracteres especiais no texto são corretamente `encodeURIComponent`-ados.
- Função de abrir: chama `navigator.share` quando presente; senão usa
  `window.open(url, '_blank', 'noopener,noreferrer')`; não lança quando ambos
  ausentes.
