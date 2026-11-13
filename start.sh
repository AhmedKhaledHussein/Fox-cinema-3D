#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo 'FOX CINEMA ready: http://localhost:4173/#/home'
node server.js
