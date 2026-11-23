#!/usr/bin/env bash
# EQ-02 · Prueba de disponibilidad en local: 2 instancias + balanceador + Redis + PostgreSQL.
# Requiere PostgreSQL (DATABASE_URL), Redis en :6379, los simuladores en :4001/:4002 y k6.
#   ./ejecutar-eq02.sh
set -euo pipefail
cd "$(dirname "$0")"
API_DIR=../../api
LOG=resultados/eq02-eventos.log
mkdir -p resultados ../k6/resultados
: > "$LOG"
evento() { echo "$(date -u +%H:%M:%S) $*" | tee -a "$LOG"; }

export JWT_SECRET=${JWT_SECRET:-secreto-de-carga-con-mas-de-32-caracteres-xx}
export DATABASE_URL=${DATABASE_URL:-postgres://hampi@localhost:5432/hampi}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export PIDE_URL=http://localhost:4001 SMS_URL=http://localhost:4002

PORT=3001 node $API_DIR/dist/server.js > resultados/instancia-1.log 2>&1 & I1=$!
PORT=3002 node $API_DIR/dist/server.js > resultados/instancia-2.log 2>&1 & I2=$!
node balanceador.mjs 8080 http://localhost:3001 http://localhost:3002 > resultados/balanceador.log 2>&1 & B=$!
trap 'kill $I1 $I2 $B 2>/dev/null || true; redis-server --daemonize yes --port 6379 --save "" >/dev/null 2>&1 || true' EXIT
sleep 4
evento "Inicio: 2 instancias sanas, Redis activo"

(cd ../k6 && k6 run -q -e API_URL=http://localhost:8080 -e ETIQUETA=eq02-disponibilidad eq02-disponibilidad.js) & K=$!

sleep 30; evento "Falla: se apaga la instancia 1 (kill -9)"; kill -9 $I1
sleep 25; evento "Falla: se apaga Redis"; redis-cli shutdown nosave >/dev/null 2>&1 || true
sleep 20; evento "Recuperación: Redis vuelve"; redis-server --daemonize yes --port 6379 --save "" >/dev/null
sleep 5;  evento "Recuperación: la instancia 1 vuelve"; PORT=3001 node $API_DIR/dist/server.js >> resultados/instancia-1.log 2>&1 & I1=$!
wait $K || true
evento "Fin. Estado del balanceador: $(curl -s localhost:8080/balanceador/estado)"
evento "Caché de la instancia 2: $(curl -s localhost:3002/salud)"
