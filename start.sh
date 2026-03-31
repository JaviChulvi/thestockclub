#!/bin/bash

# FundLord Development Startup Script
# Starts both backend (FastAPI) and frontend (Next.js) servers

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CONDA_ENV="fundlord"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        echo -e "${GREEN}Backend stopped${NC}"
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "${GREEN}Frontend stopped${NC}"
    fi

    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting FundLord Development Servers${NC}"
echo "=================================="

# Initialize conda for this script
eval "$(conda shell.bash hook)"

# Start Backend
echo -e "\n${YELLOW}Starting Backend (FastAPI)...${NC}"
cd "$PROJECT_ROOT/backend"
conda activate "$CONDA_ENV"
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}Backend started on http://localhost:8080${NC}"

# Start Frontend
echo -e "\n${YELLOW}Starting Frontend (Next.js)...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started on http://localhost:3000${NC}"

echo -e "\n${GREEN}Both servers are running!${NC}"
echo "=================================="
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo -e "\nPress Ctrl+C to stop both servers"

# Wait for both processes
wait
