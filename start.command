#!/bin/zsh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ required. Install Node.js, then open this file again."
  read '?Press Enter to close...'
  exit 1
fi
node server.js &
PID=$!
sleep 1
open 'http://localhost:4173/#/home'
wait "$PID"
