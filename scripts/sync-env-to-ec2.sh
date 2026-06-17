#!/usr/bin/env bash
# Sync local .env configuration file to EC2 server securely
# Usage: bash scripts/sync-env-to-ec2.sh
set -euo pipefail

# Configurations - fallback to env vars if exported in terminal
EC2_HOST="${EC2_HOST:-your_vps_ip_here}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_SSH_KEY="${EC2_SSH_KEY:-~/.ssh/your-key.pem}"
EC2_APP_PATH="${EC2_APP_PATH:-/home/ubuntu/foodai}"

echo "==> [sync] Checking local .env file..."
if [[ ! -f .env ]]; then
    echo "[ERROR] Local .env file not found."
    echo "        Please ensure you have configured .env in your root directory."
    exit 1
fi

echo "==> [sync] Transferring .env to ${EC2_USER}@${EC2_HOST}:${EC2_APP_PATH}/.env ..."

# Ensure destination folder exists and copy .env
ssh -i "${EC2_SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "mkdir -p ${EC2_APP_PATH}"
scp -i "${EC2_SSH_KEY}" .env "${EC2_USER}@${EC2_HOST}:${EC2_APP_PATH}/.env"

echo "==> [sync] .env file synced successfully! ✔"
