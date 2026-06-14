# [P6-06-04] Links de doação na Home (Ko-fi + Buy Me a Coffee)

## Objetivo

Adicionar à home dois links de **doação/apoio** — **Ko-fi** e **Buy Me a
Coffee** — discretos, no rodapé, com as URLs oficiais do estúdio. Primeiro passo
concreto da monetização leve e não-invasiva da visão (P7-01).

## Contexto

- O épico P6-06 pede explicitamente links de doação:
  - Ko-fi: `https://ko-fi.com/insightxlabgamestudio`
  - Buy Me a Coffee: `https://buymeacoffee.com/insight.x.lab.game.studio`
- Alinha com `PRODUCT_VISION` (monetização: doação → cosméticos → "pro";
  **nunca** pay-to-win) e adianta P7-01.
- Reusa o **helper de abrir link externo** introduzido na P6-06-03
  (`noopener,noreferrer`, SSR/headless-safe) e a faixa de rodapé já desenhada.
- URLs ficam em **constante/config** (dados separados de código), não espalhadas.

## Requisitos funcionais

1. Dois botões/links discretos no rodapé: "Ko-fi" e "Buy Me a Coffee", abrindo as
   URLs oficiais em nova aba (`noopener,noreferrer`).
2. URLs centralizadas numa constante de config (uma fonte só).
3. Visual coerente com o rodapé (discreto, não compete com "jogar"); pode usar um
   rótulo curto + ícone neon (sem assets raster).
4. Posicionamento respeita safe-areas e não colide com os ícones sociais
   (P6-06-03) nem com versão/copyright.

## Requisitos não funcionais

- Abrir externo com segurança e degradar quando `window.open` não existir.
- Sem dependências novas; estética neon mantida.
- Determinismo/simulação intocados (é UI/link externo).

## Critérios de aceite

- [ ] Ko-fi abre `https://ko-fi.com/insightxlabgamestudio`.
- [ ] Buy Me a Coffee abre `https://buymeacoffee.com/insight.x.lab.game.studio`.
- [ ] URLs vêm de uma constante única de config.
- [ ] Links abrem com `noopener,noreferrer`; sem erro quando indisponível.
- [ ] Verificação manual (`npm run dev`): links presentes, discretos e
      funcionais; sem colisão com social/versão/copyright.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/config/*` (constante com as URLs de doação)
- `src/scenes/MenuScene.ts` (botões no rodapé)
- Reuso do helper de abrir link externo da P6-06-03
- `tests/*` (se houver lógica pura, ex.: montagem da lista de links de apoio)

## Fora de escopo

- Fluxos de pagamento in-app, cosméticos pagos, "pro", anúncios (P7-02..04).
- Ícones/branding oficiais raster do Ko-fi/BMC (usar rótulo/ícone neon próprio).
- Compartilhamento social e versão/copyright (P6-06-03).

## Documentação a atualizar

- `docs/ROADMAP.md` (progresso P6-06; nota cruzando com P7-01).

## Riscos técnicos

- URLs precisam estar exatamente como fornecidas (conferir os slugs).
- Acúmulo no rodapé: social (P6-06-03) + doação + versão/copyright podem
  saturar — coordenar o layout do rodapé (faixa da P6-06-01) para caber tudo
  discretamente em retrato.

## Sugestão de testes (escrever primeiro)

- Se a lista de links de apoio for um modelo puro: contém Ko-fi e BMC com as
  URLs exatas.
- Helper de abrir externo (compartilhado com P6-06-03): chama
  `window.open(url, '_blank', 'noopener,noreferrer')`; não lança se ausente.
