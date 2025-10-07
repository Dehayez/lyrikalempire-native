#!/bin/bash

# Script to kill processes on a specific port
# Usage: ./kill-port.sh [port_number]

PORT=${1:-3000}

echo "Checking for processes on port $PORT..."

PIDS=$(lsof -ti:$PORT)

if [ -z "$PIDS" ]; then
    echo "No processes found on port $PORT"
    exit 0
fi

echo "Found processes: $PIDS"
echo "Process details:"
lsof -i:$PORT

read -p "Kill these processes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kill -9 $PIDS
    echo "Processes killed successfully"
else
    echo "Operation cancelled"
fi

