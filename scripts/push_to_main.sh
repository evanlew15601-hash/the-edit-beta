#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   TOKEN="ghp_xxx" OWNER="evanlew15601-hash" REPO="the-edit-beta" ./scripts/push_to_main.sh
#
# This script will:
# 1) Clone the repo using your PAT
# 2) Copy the current working tree contents into the clone (excluding .git)
# 3) Commit and push directly to main

: "${TOKEN:?Set TOKEN env var to your GitHub PAT}"
: "${OWNER:=evanlew15601-hash}"
: "${REPO:=the-edit-beta}"

WORKDIR="$(pwd)"
TMPDIR="$(mktemp -d)"

echo "Cloning https://${OWNER}/${REPO} into ${TMPDIR} ..."
git clone "https://${TOKEN}@github.com/${OWNER}/${REPO}.git" "${TMPDIR}/${REPO}"

cd "${TMPDIR}/${REPO}"
git checkout main
git pull --rebase

echo "Syncing working tree from ${WORKDIR} ..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' "${WORKDIR}/" "${TMPDIR}/${REPO}/"

echo "Staging changes ..."
git add -A

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  COMMIT_MSG="Global header across phases; Intro controls; Talk/DM/Scheme/Activity presets + outcome preview; alliance persona-aware preview; manual save/load; voting/jury hardening; ErrorBoundary"
  echo "Committing: ${COMMIT_MSG}"
  git commit -m "${COMMIT_MSG}"
  echo "Pushing to main ..."
  git push origin main
fi

echo "Done. Remember to revoke your PAT after push (GitHub → Settings → Developer settings → Tokens)."