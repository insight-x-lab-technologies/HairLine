# 02 — Arquitetura de Referência

> **Status:** vivo. Atualize conforme decisões mudarem.
> **Para o agente de IA (Claude Code / Codex):** leia este documento no início de cada sessão. Ele define convenções obrigatórias. Não viole os princípios da seção 3 sem registrar a exceção aqui.

---

## 1. Stack escolhida

| Camada | Escolha | Motivo |
|---|---|---|
| Engine | **Phaser 4** (v4.1.x "Salusa", abril/2026) | Padrão de facto para jogos 2D web; ecossistema enorme (vantagem para IA gerar código); renderer WebGL reescrito (node-based) com melhor performance — crítico para milhares de balas. |
| Linguagem | **TypeScript** | Tipagem ajuda a IA a não alucinar APIs e reduz bugs em refatorações agênticas. |
| Bundler / dev server | **Vite** | Rápido, HMR, build ESM. Phaser 4 corrigiu o build ESM na v4.1.0. |
| Testes | **Vitest** (unit) + Playwright (e2e opcional) | Ver doc 03. |
| Distribuição | **PWA** (Workbox/manifest) | Instalável, offline, sem app store. |
| Ranking (backend mínimo) | **Supabase** ou **Cloudflare Workers + D1/KV** (free tier) | Ver seção 7. |

> ⚠️ **Nota Phaser 3 → 4 (relevante para shmup):** a API de *tint* mudou. `setTintFill()` agora não faz nada; use `setTint()` para cor e `setTintMode(mode)` para o modo (`MULTIPLY`, `FILL`, `ADD`, `SCREEN`, `OVERLAY`, `HARD_LIGHT`). Isso afeta diretamente o efeito de "flash branco ao levar dano". Não copie tutoriais de Phaser 3 sem ajustar. Fixe a versão exata do Phaser no `package.json` no dia 1.

## 2. Diagrama mental da arquitetura

```
┌──────────────────────────────────────────────────────┐
│                      main.ts                          │
│              (config Phaser, Scale Manager)           │
└───────────────────────┬──────────────────────────────┘
                        │
        ┌───────────────┼────────────────┐
        │           Cenas (Scenes)        │
        │  Boot → Preload → Menu →         │
        │  Game ⇄ Pause ⇄ Results          │
        └───────────────┬────────────────┘
                        │
   ┌──────────┬─────────┼──────────┬─────────────┐
   │ Sistemas │ Entidades│  Dados   │   Serviços   │
   │ (lógica) │ (pools)  │ (JSON)   │ (save, RNG,  │
   │          │          │          │  audio, net) │
   └──────────┴──────────┴──────────┴─────────────┘
```

## 3. Princípios arquiteturais (não-negociáveis)

### 3.1. Determinismo é lei
O Desafio Diário exige que **a mesma seed + os mesmos inputs produzam exatamente o mesmo resultado** em qualquer dispositivo. Isso obriga:

- **Fixed timestep:** a simulação atualiza em passos fixos (ex.: 60 Hz lógico), independente do FPS de render. Nunca use `delta` cru para lógica de jogo que afete pontuação.
- **PRNG semeável e determinístico** (ex.: mulberry32 / xorshift). **Proibido** `Math.random()` em qualquer lógica que afete o jogo. Toda aleatoriedade passa pelo serviço `Rng` semeado.
- **Ordem de atualização determinística** (sem depender de ordem de iteração não-garantida).
- Benefício colateral enorme: permite **replay** (gravar só os inputs) → base do anti-cheat (seção 7).

### 3.2. Dados separados de código
- Padrões de bala, ondas, inimigos, chefes, balanceamento → **JSON/JSONC**, nunca hardcoded.
- Lógica lê dados. Isso permite você (e a IA) criar conteúdo sem tocar em sistemas, e ajustar balanceamento sem recompilar mentalidade.

### 3.3. Object pooling obrigatório
- Bullet hell cria/destrói **milhares** de balas. Instanciar/coletar lixo a cada frame = travamento no celular.
- Balas, inimigos e partículas vivem em **pools** pré-alocados, reusados. Nunca `new Bullet()` no loop de jogo.

### 3.4. Sistemas pequenos e nomeados
- Um arquivo = uma responsabilidade clara. Arquivos gigantes estouram o contexto do agente de IA e geram bugs.
- Nomes explícitos: `SpawnSystem`, `BulletSystem`, `CollisionSystem`, `GrazeSystem`, `ScoreSystem`, `BossSystem`.

### 3.5. A hitbox não é o sprite
- Convenção do gênero: a hitbox de colisão da nave é um ponto/círculo pequeno no centro, muito menor que o visual. Configure colisão por hitbox lógica, não pelo bounding box do sprite.

## 4. Estrutura de pastas (proposta)

```
/src
  main.ts
  /scenes
    BootScene.ts
    PreloadScene.ts
    MenuScene.ts
    GameScene.ts
    PauseScene.ts
    ResultsScene.ts
  /systems
    SpawnSystem.ts
    BulletSystem.ts
    CollisionSystem.ts
    GrazeSystem.ts        # mecânica central
    ScoreSystem.ts
    BossSystem.ts
    DifficultySystem.ts
  /entities
    Player.ts
    EnemyPool.ts
    BulletPool.ts
  /services
    Rng.ts                # PRNG semeável determinístico
    SaveService.ts        # localStorage / IndexedDB
    AudioService.ts
    InputService.ts       # abstrai toque/teclado/mouse
    LeaderboardService.ts # chamadas ao backend mínimo
    ReplayRecorder.ts     # grava inputs para anti-cheat
  /data
    /patterns             # padrões de bala (JSON)
    /waves                # composição de ondas (JSON)
    /enemies              # stats de inimigos (JSON)
    /bosses               # definição de chefes (JSON)
    balance.jsonc         # números globais de balanceamento
  /ui
    ...
  /config
    layout.ts             # resoluções virtuais, breakpoints
/tests
  ...
/public
  manifest.json           # PWA
  /assets
CLAUDE.md                 # convenções para o agente (ver doc 03)
```

## 5. Design responsivo (requisito central)

Um bullet hell **vertical** rodando em telas que vão de celular-retrato a desktop-widescreen é um problema real de design, não só de CSS. Abordagem:

### 5.1. Resolução virtual + Scale Manager
- Defina um **mundo de jogo de resolução fixa** (ex.: campo de jogo lógico de 720×1280, retrato).
- Use o **Scale Manager do Phaser** para encaixar esse mundo na tela física.
- Toda a lógica roda na resolução virtual; o escalonamento é só de apresentação. Isso preserva o determinismo (seção 3.1).

### 5.2. Estratégia por formato
| Dispositivo / orientação | Estratégia |
|---|---|
| **Celular retrato (primário)** | Campo de jogo ocupa a tela; HUD nas bordas superior/inferior. Modo ideal. |
| **Celular paisagem** | O campo vertical não preenche a largura. **Decisão de design:** usar as laterais para "cabines"/HUD/decoração (letterbox temático), **sem** alterar a área jogável (senão muda a dificuldade e quebra a justiça do ranking). |
| **Tablet** | Mesma lógica do celular; mais espaço para HUD e margens. |
| **Desktop widescreen** | Campo de jogo centralizado e vertical; laterais com arte/decoração ("arcade bezel"). Controle por mouse (arrastar) e teclado (setas/WASD + Shift=Foco). |

> **Princípio crítico de justiça:** a **área jogável e a densidade de balas devem ser idênticas** em todos os formatos. O que muda é a moldura ao redor, nunca o tabuleiro. Caso contrário, o Desafio Diário deixa de ser justo entre dispositivos.

### 5.3. Áreas seguras (safe areas)
- Respeitar `env(safe-area-inset-*)` para notches/ilhas dinâmicas e barras de gestos.
- Controles de toque nunca sob a área de gesto do sistema.

### 5.4. Entrada (input) abstraída
- `InputService` unifica: **toque** (arrastar para mover, segundo toque/segurar = Foco), **mouse** (arrastar), **teclado** (movimento + Foco + pausa).
- A lógica de jogo **só consome eventos abstratos** (`move`, `focus on/off`), nunca eventos brutos de dispositivo. Isso facilita testes e o ReplayRecorder.

## 6. Performance no celular (o gargalo real do gênero)

- **Pooling** (já citado) é a regra #1.
- Limite o número máximo de balas vivas; recicle as que saem da tela.
- Prefira **um spritesheet/atlas** único para reduzir trocas de textura (o renderer node-based da Phaser 4 ajuda, mas batching ainda importa).
- Partículas: orçamento fixo; degrade graciosamente em dispositivos fracos.
- Meça com profiling real em celular barato, não só no desktop. Defina um **orçamento de frame** (ex.: 16,6 ms) e trate-o como requisito.
- Tenha um "modo de qualidade" (alto/baixo) detectável ou configurável.

## 7. Backend mínimo e o problema do anti-cheat (honestidade técnica)

O ranking competitivo **quebra parcialmente** o ideal "serverless puro". Realidade:

- **localStorage não compara jogadores.** Para ranking você precisa de um backend.
- **Score enviado pelo cliente é trivialmente forjável** (qualquer um abre o DevTools e manda o número que quiser).
- **Solução pragmática habilitada pelo determinismo:** o cliente grava o **replay (sequência de inputs + seed)**, não só o score. O servidor (ou uma verificação posterior) **re-simula** a run a partir dos inputs e confirma o score. Como a simulação é determinística (seção 3.1), o resultado tem de bater.
  - Isso **não é à prova de tudo** (TAS/inputs perfeitos forjados continuam possíveis), mas elimina o trapaceiro casual.
- **Faseamento honesto:**
  1. v1: ranking "na confiança", validação de plausibilidade simples (score máximo teórico, tempo mínimo). Aceite que pode ter trapaça.
  2. Depois: validação por re-simulação de replay no servidor.
- Stack sugerida: **Supabase** (Postgres + auth anônima + edge functions) ou **Cloudflare Workers + KV/D1**. Ambos têm free tier suficiente para começar.

> Não prometa a si mesmo um ranking competitivo "sério" sem implementar a re-simulação. Até lá, é um placar social, não esportivo.

## 8. Persistência

- **localStorage:** configurações, melhor pontuação local, progresso de cosméticos.
- **IndexedDB:** se precisar guardar replays maiores localmente.
- **Backend:** apenas placares e (opcional) sincronização de progressão.

## 9. Decisões em aberto (registrar conforme decidir)

- [ ] PRNG exato (mulberry32 vs. outro).
- [ ] Supabase vs. Cloudflare para o ranking.
- [ ] Formato de serialização do replay (compacto: bitpacking de inputs por frame).
- [ ] Atlas único vs. múltiplos por estágio.
- [ ] Estratégia de áudio (Web Audio nativo vs. plugin).
