#!/usr/bin/env bash
# Serve os mockups do XLIDE v2. Uso: ./mockups/v2/serve.sh [--lan]
cd "$(dirname "$0")/../.." || exit 1
PORT=4322
HOST=127.0.0.1
if [ "$1" = "--lan" ]; then
  HOST=0.0.0.0
  IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
  echo "No celular (mesmo Wi-Fi): http://$IP:$PORT/mockups/v2/"
fi
echo "http://localhost:$PORT/mockups/v2/"
python3 -m http.server "$PORT" --bind "$HOST"
