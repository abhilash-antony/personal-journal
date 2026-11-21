#!/usr/bin/env bash
# backup.sh — Syncs journal data to a private GitHub repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Config ───────────────────────────────────────────────────────────────────
REMOTE_NAME="${BACKUP_REMOTE:-origin}"
BRANCH="${BACKUP_BRANCH:-main}"
COMMIT_MSG="${BACKUP_MSG:-Backup: $(date '+%Y-%m-%d %H:%M')}"

# ── Pre-flight ───────────────────────────────────────────────────────────────
if [ ! -d .git ]; then
  echo "✗ Not a git repository. Run: git init && git remote add $REMOTE_NAME <your-private-repo-url>"
  exit 1
fi

# Ensure clean state
git diff --quiet || { echo "✗ Uncommitted changes — commit or stash first."; exit 1; }

# Stage only ./data (journal files); ignore everything else
git add data/

# Only commit if there are changes to data/
if git diff --cached --quiet; then
  echo "✓ No changes to backup."
  exit 0
fi

git commit -m "$COMMIT_MSG"
echo "✓ Committed."

# Push to remote
git push "$REMOTE_NAME" "$BRANCH"
echo "✓ Pushed to $REMOTE_NAME/$BRANCH."
