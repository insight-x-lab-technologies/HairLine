#!/usr/bin/env bash
# Encerra o servidor de desenvolvimento iniciado por scripts/run.sh.
# Mata o GRUPO de processos (Vite + filhos node) via PID file; se não houver
# PID file, faz um fallback best-effort por linha de comando.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"
PIDFILE="$ROOT/.dev-server.pid"

# Encerra um grupo de processos (TERM, depois KILL se persistir).
kill_group() {
  local pid="$1"
  kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 25); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.2
  done
  kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

stopped=0
if [[ -f "$PIDFILE" ]]; then
  PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill_group "$PID"
    echo "Servidor parado (PID $PID)."
    stopped=1
  else
    echo "PID file encontrado, mas o processo não está ativo."
  fi
  rm -f "$PIDFILE"
fi

if [[ "$stopped" -eq 0 ]]; then
  # Fallback PRECISO: encerra apenas quem está ESCUTANDO a porta (via fuser),
  # evitando matar processos cuja linha de comando apenas mencione a porta.
  if command -v fuser >/dev/null 2>&1 && fuser -s "$PORT/tcp" 2>/dev/null; then
    fuser -k -TERM "$PORT/tcp" >/dev/null 2>&1 || true
    sleep 0.5
    fuser -s "$PORT/tcp" 2>/dev/null && fuser -k -KILL "$PORT/tcp" >/dev/null 2>&1 || true
    echo "Servidor encerrado via fallback (porta $PORT)."
  else
    echo "Nenhum servidor de desenvolvimento ativo na porta $PORT."
  fi
fi
