#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time preparation of a fresh Ubuntu 22.04/24.04 server:
# installs Docker Engine + Compose plugin and opens SSH + HTTP in the firewall.
#   curl -fsSL <raw-url>/scripts/server-setup.sh | sudo bash     (or run it after cloning)
# ---------------------------------------------------------------------------
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  apt-get update -y
  apt-get install -y ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

if [[ -n "${SUDO_USER:-}" ]]; then
  usermod -aG docker "$SUDO_USER"
  echo "==> Added $SUDO_USER to the docker group (log out and back in to use docker without sudo)"
fi

if command -v ufw >/dev/null 2>&1; then
  echo "==> Configuring firewall (SSH + HTTP)"
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw --force enable
fi

docker --version
docker compose version
echo "==> Server ready. Next: git clone <repo> && cd <repo> && cp .env.example .env && nano .env && ./scripts/deploy.sh --no-pull"
