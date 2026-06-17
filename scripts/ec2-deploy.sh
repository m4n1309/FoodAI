#!/usr/bin/env bash
# Deploy FoodAI to EC2/VPS via Docker Compose
# Usage on server: bash scripts/ec2-deploy.sh
set -euo pipefail

# Find project root directory relative to this script
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.ec2.yml"
GIT_BRANCH="main"

echo "==> [deploy] Workspace directory: $ROOT"

# Sync with remote branch to ensure latest changes are checked out
if [[ "${SKIP_GIT_SYNC:-0}" != "1" ]]; then
    echo "==> [deploy] Syncing repository with origin/${GIT_BRANCH}..."
    git fetch origin "${GIT_BRANCH}"
    git checkout "${GIT_BRANCH}"
    
    # Check for hand-made untracked edits in tracked files to prevent merge block
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "==> [deploy] Local modifications detected on host, resetting to clean remote origin/${GIT_BRANCH}..."
        git reset --hard "origin/${GIT_BRANCH}"
    fi
fi

# Verify production .env is configured before starting
if [[ ! -f .env ]]; then
    echo "==> [ERROR] Missing .env configuration file on server."
    echo "    Please create a production .env file in the project root."
    exit 1
fi

echo "==> [deploy] Rebuilding and launching Docker containers..."
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> [deploy] Cleaning up old unused dangling images..."
docker image prune -f

echo "==> [deploy] Checking services state..."
docker compose -f "${COMPOSE_FILE}" ps

echo "==> [deploy] Deploy completed successfully! 🎉"
