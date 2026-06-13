# 03 — Processo de Desenvolvimento

> **Status:** vivo.
> **Propósito:** definir *como* o trabalho é feito, de modo que o desenvolvimento agêntico (Claude Code / Codex) seja **estruturado**, não caótico. Este é o documento que separa "vibecoding estruturado" de "vibecoding que vira dívida técnica".

---

## 1. Princípio geral do fluxo

Cada funcionalidade segue o ciclo:

```
Documentar funcionalidade → Escrever spec → Escrever testes (falhando)
  → Implementar (agente de IA) → Testes passam → Revisão humana → Merge
```

Ou seja: **a IA implementa contra uma spec e contra testes que você definiu antes**. Isso ancora o agente e te dá um critério objetivo de "pronto". Sem isso, o agente entrega algo plausível mas não verificável.

## 2. O arquivo `CLAUDE.md` (contrato do agente)

Na raiz do repo, um `CLAUDE.md` (ou `AGENTS.md` para Codex) que o agente lê em toda sessão. Deve conter, de forma curta:

- Resumo de 3 linhas do jogo (link para doc 01).
- A stack e a versão fixa do Phaser (link para doc 02).
- **Princípios não-negociáveis** (determinismo, pooling, dados-em-JSON, hitbox ≠ sprite) — repetidos aqui porque o agente nem sempre lê os docs longos.
- Convenções de código: estilo, nomes, estrutura de pastas.
- Como rodar: `dev`, `build`, `test`, `lint`.
- **O que o agente NÃO deve fazer:** usar `Math.random()` na lógica de jogo; criar objetos no loop sem pool; hardcodar balanceamento; quebrar determinismo; "consertar" um teste mudando o teste em vez do código.
- Onde encontrar specs e testes.

> Mantenha `CLAUDE.md` curto e atualizado. Ele é lido toda hora; se inchar, o agente ignora.

## 3. Documentação de funcionalidade

Antes de codar uma feature, crie um arquivo curto em `/docs/features/<nome>.md` com:

- **Objetivo:** o que e por quê (1 parágrafo).
- **Comportamento esperado:** em texto claro, do ponto de vista do jogador.
- **Entradas/saídas e estados.**
- **Casos de borda** (o que pode dar errado).
- **Impacto no determinismo** (se mexe em RNG, timestep ou ordem de update — marcar explicitamente).
- **Critério de aceite:** lista verificável.

Exemplo de critério de aceite para a mecânica de Graze:
- Quando a nave passa a ≤ X px de uma bala inimiga sem colidir, o medidor de Foco aumenta em Y.
- O graze de uma mesma bala não conta duas vezes.
- Graze não dispara em modo Pausa.
- A contagem de graze é determinística para a mesma seed + inputs.

## 4. Spec técnica

Para features não-triviais, uma spec em `/docs/specs/<nome>.md` que traduz a documentação de funcionalidade em **contrato técnico**:

- Assinaturas de funções/classes e tipos (TypeScript).
- Quais sistemas/arquivos são tocados.
- Estruturas de dados (formato do JSON, se aplicável).
- Eventos emitidos/consumidos.
- Invariantes que os testes vão checar.

A spec é o que você entrega ao agente. Quanto mais precisa, menos o agente "inventa".

## 5. Testes

### 5.1. Filosofia
Bullet hell tem lógica determinística pesada (RNG, padrões, colisão, pontuação) — **altamente testável**. Renderização e "feel" não são testáveis automaticamente; isso fica para teste manual.

| Tipo | O que testar | Ferramenta |
|---|---|---|
| **Unitário** | RNG determinístico; sistemas de score/graze; geração de padrões a partir de seed; colisão (hitbox); difficulty scaling | **Vitest** |
| **Integração** | Uma onda completa produz o mesmo estado final para a mesma seed+inputs | Vitest |
| **Replay/determinismo** | Re-simular um replay gravado reproduz exatamente o mesmo score | Vitest |
| **E2E (opcional)** | O jogo carrega, menu→jogo→resultado funciona | Playwright |
| **Manual** | "Feel", responsividade em dispositivos reais, performance | Você, no celular |

### 5.2. O teste mais importante do projeto: determinismo
Um teste que: dado `seed = S` e uma sequência fixa de inputs, roda a simulação **headless** (sem render) por N frames e compara o estado final (ou um hash do estado) com um valor de referência (golden). Se esse teste quebra, o ranking diário está comprometido.

Para isso, a **lógica de jogo precisa rodar sem o render do Phaser** — daí a separação sistemas/cenas do doc 02. A simulação deve ser instanciável e "tickável" em testes.

### 5.3. Exemplo de teste unitário (Vitest)

```ts
import { describe, it, expect } from 'vitest';
import { Rng } from '../src/services/Rng';

describe('Rng — determinismo', () => {
  it('mesma seed produz mesma sequência', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes divergem', () => {
    const a = new Rng(1).next();
    const b = new Rng(2).next();
    expect(a).not.toEqual(b);
  });
});
```

### 5.4. Regra de ouro dos testes com IA
O agente **não pode "passar" um teste alterando o teste** para acomodar um bug. Se um teste precisa mudar, isso é uma decisão humana, registrada no commit. Coloque isso explicitamente no `CLAUDE.md`.

## 6. Automação (CI/CD)

- **GitHub Actions** (free para repos públicos/privados pequenos):
  - Em cada push/PR: `lint` → `typecheck` → `test`. PR não mergeia se algo falha.
  - Em merge na `main`: `build` → deploy automático.
- **Deploy:** Cloudflare Pages, Netlify ou Vercel (free tier) servem o PWA estático.
- **Pré-commit** (Husky + lint-staged): roda lint/typecheck local antes do commit, para o agente não empurrar lixo.

## 7. Controle de versão e ritmo

- Branches curtas por feature; PRs pequenos (o agente trabalha melhor e você revisa melhor).
- Commits descritivos (o agente tende a escrever bons; revise).
- **Tag de versão** a cada marco do roadmap.
- Como é hobby: trabalhe em **fatias pequenas e fechadas**. "Implementar a mecânica de graze com testes" é uma boa fatia. "Fazer o jogo" não é.

## 8. Revisão humana (o seu papel insubstituível)

A IA escreve código; **você decide o que é divertido**. Nenhum teste mede diversão, "game feel", clareza visual das balas, ou justiça da dificuldade. Reserve tempo de **jogar e sentir**, não só de revisar diffs. Esse é o trabalho que não dá para delegar.

## 9. Definição de "Pronto" (Definition of Done)

Uma feature está pronta quando:
- [ ] Documentação de funcionalidade existe.
- [ ] Spec existe (se não-trivial).
- [ ] Testes escritos e passando.
- [ ] Determinismo preservado (teste golden não quebrou).
- [ ] Lint/typecheck limpos.
- [ ] Revisado e **jogado** por você.
- [ ] Mergeado e deployado.
