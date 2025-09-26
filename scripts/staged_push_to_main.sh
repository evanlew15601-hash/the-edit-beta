#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   TOKEN="ghp_xxx" OWNER="evanlew15601-hash" REPO="the-edit-beta" ./scripts/staged_push_to_main.sh
#
# This script pushes the current working tree to GitHub in smaller, staged commits
# to avoid "Request Entity Too Large" when merging a huge PR.
#
# It:
#  1) Clones the remote repo using a PAT
#  2) Commits and pushes groups of files sequentially directly to main
#  3) Each group is a separate commit to reduce payload
#
# After running, rebuild your Lovable preview for main.

: "${TOKEN:?Set TOKEN env var to your GitHub PAT}"
: "${OWNER:=evanlew15601-hash}"
: "${REPO:=the-edit-beta}"

WORKDIR="$(pwd)"
TMPDIR="$(mktemp -d)"
REPO_DIR="${TMPDIR}/${REPO}"

echo "[info] Cloning repo into ${REPO_DIR} ..."
git clone "https://${TOKEN}@github.com/${OWNER}/${REPO}.git" "${REPO_DIR}"
cd "${REPO_DIR}"
git checkout main
git pull --rebase

# Helper to copy and commit a set of files
copy_and_commit() {
  local commit_msg="$1"; shift
  local files=("$@")

  echo "[info] Staging group: ${commit_msg}"
  for f in "${files[@]}"; do
    src="${WORKDIR}/${f}"
    dest="${REPO_DIR}/${f}"
    if [[ -f "${src}" ]]; then
      mkdir -p "$(dirname "${dest}")"
      cp "${src}" "${dest}"
      git add "${f}"
    else
      echo "[warn] Skipping missing file: ${src}"
    fi
  done

  if git diff --cached --quiet; then
    echo "[info] No changes detected for: ${commit_msg}"
    return 0
  fi

  echo "[info] Committing: ${commit_msg}"
  git commit -m "${commit_msg}"
  echo "[info] Pushing commit to main ..."
  git push origin main
}

# Group A: Global header + layout + router
GROUP_A_MSG="Global header across phases + layout wrapper + router wiring"
GROUP_A_FILES=(
  "src/components/game/DashboardHeader.tsx"
  "src/components/game/GameLayout.tsx"
  "src/pages/Index.tsx"
)

# Group B: Intro controls
GROUP_B_MSG="Intro screen top bar controls (Continue/Delete/Debug)"
GROUP_B_FILES=(
  "src/components/game/IntroScreen.tsx"
)

# Group C: Dialog presets + previews (Talk/DM/Scheme/Activity)
GROUP_C_MSG="Dialog presets + outcome previews for Talk/DM/Scheme/Activity"
GROUP_C_FILES=(
  "src/components/game/ConversationDialog.tsx"
  "src/components/game/DirectMessageDialog.tsx"
  "src/components/game/SchemeDialog.tsx"
  "src/components/game/ActivityDialog.tsx"
)

# Group D: Alliance meeting persona-aware preview
GROUP_D_MSG="Alliance Meeting persona-aware preview adjustments"
GROUP_D_FILES=(
  "src/components/game/AllianceMeetingDialog.tsx"
)

# Group E: Manual save/load behavior + ErrorBoundary
GROUP_E_MSG="Manual save/load only + global ErrorBoundary"
GROUP_E_FILES=(
  "src/hooks/useGameState.ts"
  "src/components/ui/ErrorBoundary.tsx"
  "src/App.tsx"
)

copy_and_commit "${GROUP_A_MSG}" "${GROUP_A_FILES[@]}"
copy_and_commit "${GROUP_B_MSG}" "${GROUP_B_FILES[@]}"
copy_and_commit "${GROUP_C_MSG}" "${GROUP_C_FILES[@]}"
copy_and_commit "${GROUP_D_MSG}" "${GROUP_D_FILES[@]}"
copy_and_commit "${GROUP_E_MSG}" "${GROUP_E_FILES[@]}"

echo "[done] Staged pushes complete."
echo "Rebuild your Lovable preview for main, then hard-refresh (Ctrl/Cmd+Shift+R)."