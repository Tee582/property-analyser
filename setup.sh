#!/usr/bin/env bash
set -e

# ══════════════════════════════════════════════════════
#  PropScore — Automated Setup Script
#  Run this once and everything is set up automatically
# ══════════════════════════════════════════════════════

SITE_ID="820709fd-6ad8-44a4-a353-41d15955eaf1"
SITE_NAME="prop-score-analyser"
REPO_NAME="property-analyser"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PropScore — Automated Deploy Setup      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Check and install prerequisites ──────────────
echo "▶ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v netlify &>/dev/null; then
  echo "  Installing Netlify CLI..."
  npm install -g netlify-cli
fi

if ! command -v gh &>/dev/null; then
  echo "  Installing GitHub CLI..."
  (type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
    && sudo mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && sudo apt update \
    && sudo apt install gh -y
fi

echo "  ✓ All prerequisites ready"
echo ""

# ── 2. GitHub login and repo setup ──────────────────
echo "▶ Setting up GitHub repository..."

if ! gh auth status &>/dev/null; then
  echo "  Opening GitHub login (follow the prompts)..."
  gh auth login --web
fi

GH_USER=$(gh api user --jq '.login')
echo "  ✓ Logged in as: $GH_USER"

# Create GitHub repo (skip if exists)
if ! gh repo view "$GH_USER/$REPO_NAME" &>/dev/null; then
  echo "  Creating GitHub repo: $REPO_NAME..."
  gh repo create "$REPO_NAME" --public --description "PropScore — Property Investment Analysis Platform" --confirm 2>/dev/null || \
  gh repo create "$REPO_NAME" --public --description "PropScore — Property Investment Analysis Platform" 2>/dev/null || true
fi

echo "  ✓ Repository: github.com/$GH_USER/$REPO_NAME"
echo ""

# ── 3. Git init and push ─────────────────────────────
echo "▶ Pushing code to GitHub..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

git -C "$SCRIPT_DIR" init -b main 2>/dev/null || git -C "$SCRIPT_DIR" init
git -C "$SCRIPT_DIR" add -A
git -C "$SCRIPT_DIR" commit -m "Initial commit — PropScore property analyser" --allow-empty 2>/dev/null || true

REMOTE_URL="https://github.com/$GH_USER/$REPO_NAME.git"

if git -C "$SCRIPT_DIR" remote get-url origin &>/dev/null; then
  git -C "$SCRIPT_DIR" remote set-url origin "$REMOTE_URL"
else
  git -C "$SCRIPT_DIR" remote add origin "$REMOTE_URL"
fi

git -C "$SCRIPT_DIR" push -u origin main --force

echo "  ✓ Code pushed to GitHub"
echo ""

# ── 4. Netlify login ─────────────────────────────────
echo "▶ Authenticating with Netlify..."

if ! netlify status &>/dev/null 2>&1 || netlify status 2>&1 | grep -q "Not logged in"; then
  echo "  Opening Netlify login (follow the prompts)..."
  netlify login
fi

echo "  ✓ Netlify authenticated"
echo ""

# ── 5. Link to existing Netlify site ────────────────
echo "▶ Linking to Netlify site..."

cd "$SCRIPT_DIR"

# Write .netlify/state.json to link the site
mkdir -p .netlify
cat > .netlify/state.json <<EOF
{
  "siteId": "$SITE_ID"
}
EOF

echo "  ✓ Linked to: $SITE_NAME ($SITE_ID)"
echo ""

# ── 6. Install dependencies ──────────────────────────
echo "▶ Installing npm dependencies..."
npm install
echo "  ✓ Dependencies installed"
echo ""

# ── 7. Deploy to Netlify ─────────────────────────────
echo "▶ Deploying to Netlify (this takes ~1 min)..."
netlify deploy --prod --message "Initial deploy via setup script"

echo ""
echo "✓ Database will auto-provision on first function call"
echo ""

# ── 8. Connect GitHub to Netlify ─────────────────────
echo "▶ Your site is live!"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  🎉 Deploy complete!                                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  App URL:  https://$SITE_NAME.netlify.app            ║"
echo "║  GitHub:   https://github.com/$GH_USER/$REPO_NAME   ║"
echo "║  Netlify:  https://app.netlify.com/projects/$SITE_NAME ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  💡 For auto-deploy on git push, connect GitHub in  ║"
echo "║     Netlify dashboard: Site → Build & deploy → Git   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
