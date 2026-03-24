#!/bin/bash
# ApiArk APT repository installer
# Usage: curl -fsSL https://berbicanes.github.io/apiark-apt/install.sh | sudo bash

set -euo pipefail

REPO_URL="https://berbicanes.github.io/apiark-apt"
KEYRING="/usr/share/keyrings/apiark-archive-keyring.gpg"
LIST="/etc/apt/sources.list.d/apiark.list"

echo "Adding ApiArk APT repository..."

# Download and install GPG key
curl -fsSL "${REPO_URL}/gpg-key.gpg" | gpg --dearmor -o "${KEYRING}"

# Add repository
echo "deb [signed-by=${KEYRING}] ${REPO_URL} stable main" > "${LIST}"

# Update and install
apt-get update -o Dir::Etc::sourcelist="${LIST}" -o Dir::Etc::sourceparts="-" -o APT::Get::List-Cleanup="0"
echo ""
echo "Repository added. Install ApiArk with:"
echo "  sudo apt install apiark"
