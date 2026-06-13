# /data — conteúdo dirigido por dados (docs/02 §3.2)

Princípio não-negociável: **dados separados de código**. Padrões de bala,
ondas, inimigos, chefes e balanceamento moram aqui como JSON/JSONC e são
**lidos** pela lógica — nunca hardcoded.

- `patterns/` — padrões de bala (Fase 1+).
- `waves/` — composição de ondas (Fase 1+).
- `enemies/` — stats de inimigos (Fase 1+).
- `bosses/` — definição de chefes (Fase 1+).
- `balance.jsonc` — números globais de balanceamento.

Na Fase 0 estão vazios de propósito: ainda não há gameplay.
