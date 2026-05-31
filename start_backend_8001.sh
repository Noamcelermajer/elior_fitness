#!/bin/bash
cd /mnt/c/Users/noamc/elior_fitness
source venv/bin/activate
export PERSISTENT_PATH=/mnt/c/Users/noamc/elior_fitness
export LOG_DIR=/mnt/c/Users/noamc/elior_fitness/logs
export ENVIRONMENT=development
export DATABASE_URL=sqlite:///./data/elior_fitness.db
export CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload > backend_8001.log 2>&1 &
echo $! > backend_8001.pid
sleep 5
curl -s http://localhost:8001/health
echo ""
