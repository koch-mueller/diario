#!/bin/bash
cd "$(dirname "$0")" || exit 1
node setup-diario.mjs
status=$?

echo
read -r -p "Enter drücken zum Schließen ..."
exit "$status"
