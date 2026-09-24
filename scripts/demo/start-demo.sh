#!/usr/bin/env bash
# Levanta la app completa con datos ficticios para una demostración en vivo.
#
#   ./scripts/demo/start-demo.sh           # usa la base demo si ya existe
#   ./scripts/demo/start-demo.sh --reset   # la borra y la vuelve a llenar
#
# Aislada de todo lo real: base propia (casarespuestos_demo), puertos propios
# y un Dataico simulado local, así que vender en vivo NUNCA llega a la DIAN.
# Ctrl+C apaga todo.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="$ROOT/apps/api"
CLIENT_DIR="$ROOT/apps/client"
LOG_DIR="$ROOT/scripts/demo/output"
mkdir -p "$LOG_DIR"

API_PORT=3300
CLIENT_PORT=5300
MOCK_PORT=4010

# Postgres y JWT salen del .env de la API; todo lo demás se fuerza aquí.
set -a
# shellcheck disable=SC1091
. "$API_DIR/.env"
set +a
export DB_NAME=casarespuestos_demo
export PORT=$API_PORT
export CORS_ORIGINS="http://localhost:$CLIENT_PORT"
export DATAICO_BASE_URL="http://localhost:$MOCK_PORT"
export DATAICO_PAYROLL_BASE_URL="http://localhost:$MOCK_PORT"
export DATAICO_AUTH_TOKEN=demo
export DATAICO_ACCOUNT_ID=demo
export DATAICO_SEND_DIAN=false
export DATAICO_SEND_EMAIL=false
export INVOICE_NUMBER_START=1001
export CREDIT_NOTE_NUMBER_START=1
export DEBIT_NOTE_NUMBER_START=1
export SEED_ADMIN_EMAIL=admin@demo.com
export SEED_ADMIN_PASSWORD='Demo1234!'
export SEED_ADMIN_FIRST_NAME=Administrador
export SEED_ADMIN_LAST_NAME=Demo

PIDS=()
cleanup() {
  echo
  echo "Apagando la demo..."
  for pid in "${PIDS[@]}"; do kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT

for port in $API_PORT $CLIENT_PORT $MOCK_PORT; do
  if ss -ltn 2>/dev/null | grep -q ":$port "; then
    echo "El puerto $port ya está en uso — ¿quedó otra demo abierta?" >&2
    exit 1
  fi
done

# 1. Postgres
if command -v docker >/dev/null 2>&1; then
  # Si Docker no está disponible, se sigue: puede haber otro Postgres corriendo.
  (cd "$ROOT" && docker compose up -d postgres >/dev/null 2>&1) || true
fi
db() {
  (cd "$API_DIR" && node -e "
    const { Client } = require('pg');
    const c = new Client({ host: process.env.DB_HOST, port: +process.env.DB_PORT,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'postgres' });
    c.connect().then(() => c.query(process.argv[1])).then((r) => { console.log(r.rows?.[0]?.n ?? ''); return c.end(); })
      .catch((e) => { console.error(e.message); process.exit(1); });" "$1")
}
echo "Esperando a Postgres en $DB_HOST:$DB_PORT..."
for _ in $(seq 1 30); do db 'SELECT 1 AS n' >/dev/null 2>&1 && break; sleep 1; done
db 'SELECT 1 AS n' >/dev/null || { echo "No hay Postgres en $DB_HOST:$DB_PORT (¿Docker Desktop abierto?)" >&2; exit 1; }

if [[ "${1:-}" == "--reset" ]]; then
  echo "Borrando la base demo..."
  db "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE)" >/dev/null
fi
if [[ "$(db "SELECT COUNT(*)::int AS n FROM pg_database WHERE datname = '$DB_NAME'")" == "0" ]]; then
  db "CREATE DATABASE $DB_NAME" >/dev/null
fi

(cd "$API_DIR" && npm run --silent migration:run >/dev/null && npm run --silent seed:admin)

# 2. Dataico simulado + API
setsid node "$ROOT/scripts/demo/mock-dataico.mjs" >"$LOG_DIR/mock-dataico.log" 2>&1 &
PIDS+=($!)
echo "Compilando y levantando la API (puede tardar ~30 s)..."
setsid bash -c "cd '$API_DIR' && exec npm run start" >"$LOG_DIR/api.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 120); do
  curl -sf "http://localhost:$API_PORT/api/docs" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://localhost:$API_PORT/api/docs" >/dev/null || { echo "La API no arrancó, mira $LOG_DIR/api.log" >&2; exit 1; }

(cd "$API_DIR" && npm run --silent seed:demo)

# 3. Cliente
VITE_API_URL="http://localhost:$API_PORT" setsid bash -c "cd '$CLIENT_DIR' && exec npx vite --port $CLIENT_PORT --strictPort" >"$LOG_DIR/client.log" 2>&1 &
PIDS+=($!)
sleep 3

cat <<EOF

  ✅ Demo lista en  http://localhost:$CLIENT_PORT

  Usuarios (contraseña para todos: Demo1234!)
    admin@demo.com      Administrador — ve todo
    empleado@demo.com   Mostrador — vende, cotiza, maneja la caja
    bodega@demo.com     Bodega — productos, inventario y compras
    contador@demo.com   Contador (auditor) — solo consulta

  Facturas van a un Dataico SIMULADO: nada llega a la DIAN.

  Ctrl+C para apagar.
EOF
wait
