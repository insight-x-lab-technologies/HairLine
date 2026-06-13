/**
 * Cloudflare Worker — backend mínimo do ranking diário do HAIRLINE
 * (docs/04 Fase 3, docs/leaderboard-backend.md). Armazena em KV.
 *
 * NÃO está implantado: requer conta Cloudflare + namespace KV + deploy via
 * `wrangler deploy` (ver wrangler.jsonc e o doc). O cliente é RemoteLeaderboard
 * (src/services/LeaderboardService.ts), selecionado por VITE_LEADERBOARD_URL.
 *
 * Endpoints:
 *   GET  /api/leaderboard?day=YYYY-MM-DD&n=10  → top N (JSON)
 *   POST /api/leaderboard  body {dayKey,name,score,id}  → grava (dedupe por id)
 *
 * Anti-cheat v1: validação de plausibilidade simples (tipos/limites). A
 * re-simulação de replay no servidor (a sim é portável) é evolução futura.
 *
 * Este arquivo roda no runtime do Workers e é excluído do tsc/eslint do app.
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
interface Env {
  LEADERBOARD: KVNamespace;
}

interface Entry {
  name: string;
  score: number;
  id?: string;
  at?: number;
}

const MAX_ENTRIES = 100;
const MAX_NAME = 16;
const MAX_SCORE = 100_000_000; // teto de plausibilidade

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

function isDayKey(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    if (url.pathname !== '/api/leaderboard') return json({ error: 'not found' }, 404);

    if (req.method === 'GET') {
      const day = url.searchParams.get('day');
      if (!isDayKey(day)) return json({ error: 'bad day' }, 400);
      const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') ?? '10')));
      const list = await read(env, day);
      return json(list.slice(0, n));
    }

    if (req.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return json({ error: 'bad json' }, 400);
      }
      const day = body.dayKey;
      const score = body.score;
      if (!isDayKey(day)) return json({ error: 'bad day' }, 400);
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return json({ error: 'bad score' }, 400);
      }
      const entry: Entry = {
        name: String(body.name ?? 'jogador').slice(0, MAX_NAME),
        score: Math.floor(score),
        at: Date.now(),
        ...(typeof body.id === 'string' ? { id: body.id.slice(0, 64) } : {}),
      };
      const list = await read(env, day);
      // Dedupe por id: mantém o melhor score do jogador.
      const filtered = entry.id ? list.filter((e) => e.id !== entry.id) : list;
      filtered.push(entry);
      filtered.sort((a, b) => b.score - a.score);
      filtered.length = Math.min(filtered.length, MAX_ENTRIES);
      await env.LEADERBOARD.put(`lb:${day}`, JSON.stringify(filtered));
      return json({ ok: true });
    }

    return json({ error: 'method' }, 405);
  },
};

async function read(env: Env, day: string): Promise<Entry[]> {
  const raw = await env.LEADERBOARD.get(`lb:${day}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}
