#!/bin/bash

# CodeLog Stop Script

echo "🛑 Stopping CodeLog..."

docker compose down

echo "✅ CodeLog has been stopped."
echo ""
echo "💡 To start again, run: ./start.sh"
echo "💡 To remove all data, run: docker compose down -v"
