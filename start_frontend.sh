#!/bin/bash
cd /mnt/c/Users/noamc/elior_fitness/Frontend
nohup npm run dev -- --host > frontend.log 2>&1 &
echo $! > frontend.pid
sleep 8
cat frontend.log | tail -20
