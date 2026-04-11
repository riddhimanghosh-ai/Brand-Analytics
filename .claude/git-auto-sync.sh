#!/bin/bash

# Auto-sync script for continuous GitHub deployment
# This script runs after any file changes and auto-commits/pushes to GitHub

cd "$(dirname "$0")/.." || exit 1

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

# Get the list of changed files
CHANGED_FILES=$(git status --porcelain | head -5)

# Determine commit message based on changes
if echo "$CHANGED_FILES" | grep -q "src/"; then
  COMMIT_MESSAGE="chore: auto-sync - code changes"
else
  COMMIT_MESSAGE="chore: auto-sync - configuration updates"
fi

# Stage all changes
git add -A

# Commit
git commit -m "$COMMIT_MESSAGE

Auto-synced changes from development.

Files changed:
$CHANGED_FILES

Co-Authored-By: Brand Analytics Bot <bot@brand-analytics.local>" 2>/dev/null

# Push to GitHub with stored credentials
git push origin main 2>/dev/null || {
  echo "Warning: Push to GitHub failed. Please run 'git push origin main' manually or provide fresh credentials."
  exit 1
}

echo "✓ Auto-synced to GitHub"
