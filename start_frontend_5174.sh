#!/bin/bash
cd /mnt/c/Users/noamc/elior_fitness/Frontend
npm run dev -- --host --port 5174 > frontend_5174.log 2>&1 &
echo $! > frontend_5174.pid
sleep 8
curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/
echo ""
