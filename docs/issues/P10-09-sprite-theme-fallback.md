# [P10-09] `SpriteTheme` (render por sprites) com fallback vetorial + pipeline de assets

## Objetivo

Implementar o **tema "Polido"** no lado do código: um `SpriteTheme` que desenha
**sprites** lendo as mesmas posições autoritativas da sim e, **onde faltar asset,
cai no `VectorTheme`**. Inclui o **pipeline de assets** (atlas no Preload + PWA) e
o pooling de sprites. Sem produzir a arte final (placeholders bastam para validar
o fluxo).

## Contexto

- Depende de **P10-02** (`GameRenderer`) e **P10-04** (registro de temas + carga
  condicional). É a peça que torna o eixo visual realmente "dois temas".
- Estratégia validada: **vetorial = padrão gerativo; sprite = camada por cima com
  fallback vetorial** ⇒ arte pode entrar incrementalmente (P10-10/11) sem nunca
  deixar o jogo inconsistente.
- Pooling já é princípio (TD-07): nunca `new` no loop — sprites também são
  pré-alocados e reposicionados por frame.

## Requisitos funcionais

1. `SpriteTheme` implementa `GameRenderer`: para cada entidade (nave, inimigo,
   chefe), se houver sprite/atlas registrado, desenha o sprite na posição/rotação/
   escala derivada do estado; **senão delega ao `VectorTheme`** (composição/
   herança — decidir a menor abordagem segura).
2. **Pool de sprites** por categoria (espelha `BulletPool`/`EnemyPool`): adquirir/
   liberar por frame, sem alocação no loop; sprites ociosos invisíveis.
3. **Balas e anel de graze permanecem vetoriais neon** mesmo no `SpriteTheme`
   (legibilidade > beleza) — reuso direto do desenho do `VectorTheme`.
4. **Pipeline de assets**: `PreloadScene` carrega o(s) atlas do tema "polido"
   **apenas quando ativo** (via manifesto do registro — P10-04); configurar
   precache/exclusão no PWA (`vite-plugin-pwa`) para não inchar o tema arcade.
5. Registrar o tema "polido" no registro (P10-04) para aparecer no seletor.
6. Sem tocar `src/sim`/`src/systems`.

## Requisitos não funcionais

- Determinismo/replay/`hashState()`/leaderboard intactos.
- **Sem `new` no loop** (pooling de sprites obrigatório).
- Fallback transparente: enquanto não há arte (P10-10/11), o tema "polido" é
  jogável e correto (cai no vetorial); nada quebra.
- Peso/PWA: assets do "polido" não podem ser baixados/precacheados no arcade.
- Performance: sprites em batch devem ser ≥ o custo do `Graphics` atual.

## Critérios de aceite

- [ ] Selecionar "Polido" (P10-04) usa `SpriteTheme`; sem assets ⇒ visual idêntico
      ao vetorial (fallback) — manual no `npm run dev`.
- [ ] Com um sprite placeholder registrado para a nave, a nave aparece como sprite;
      o resto cai no vetorial — prova do fallback parcial.
- [ ] Balas e anel de graze seguem vetoriais nos dois temas.
- [ ] Nenhum asset do "polido" é carregado/precacheado quando o tema é arcade.
- [ ] Sem alocação no loop (sprites via pool).
- [ ] Regressão de determinismo: tema não muda `hashState()`/replay.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/SpriteTheme.ts` (novo) + registro em `src/render/themes.ts`
- `src/render/VectorTheme.ts` (reuso para fallback + balas/anel)
- `src/entities/` ou `src/render/` (pool de sprites)
- `src/scenes/PreloadScene.ts` (carga condicional do atlas)
- `vite.config.ts` (PWA: precache/exclusão dos assets por tema)
- `public/` ou `src/assets/` (placeholder de atlas para validar)

## Fora de escopo

- **Produção da arte final** (nave/chefes/inimigos — P10-10; fundo — P10-11).
- Áudio por samples (P10-12) e cruzamento com cosméticos (P10-13).
- Animações elaboradas (frames/skeletal) — escopo é desenhar sprite estático/
  girando; animação pode virar issue própria.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`SpriteTheme`, pool de sprites, pipeline de assets,
  carga condicional, PWA por tema).
- `docs/TECH_DECISIONS.md` **(obrigatório)**: TD do tema sprite + fallback
  vetorial + estratégia de assets/PWA (relaciona com TD-08 "Graphics por frame" e
  com o TD da abstração de render). Mudança de arquitetura.
- `docs/ROADMAP.md` (progresso P10-09).

## Riscos técnicos

- Inchar o bundle/PWA do tema arcade ao incluir assets — manifesto estrito por
  tema; conferir o build.
- Mistura sprite+vetorial inconsistente (escalas/alinhamento) durante a transição
  — definir âncora/origem comum (centro = posição da sim).
- Fallback duplicando lógica do `VectorTheme` — reusar, não copiar.
- Memória de texturas em celular fraco — atlas enxuto; medir.

## Sugestão de testes (escrever primeiro)

- (headless) resolução de fallback: dado um manifesto sem sprite para X ⇒ o tema
  reporta "usar vetorial para X" (função pura de seleção asset×fallback).
- Registro/manifesto por tema (carga condicional) coberto como em P10-04.
- Regressão de determinismo (reexecutar).
- Integração visual/pool/PWA são manuais — checklist no PR (FPS, requests de
  assets por tema).
