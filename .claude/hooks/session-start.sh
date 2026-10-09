#!/usr/bin/env bash
# SessionStart: in cloud sessions, install dependencies and show the run state.
# Local sessions: no output, no install (make targets install on demand).
set -u
cd "$CLAUDE_PROJECT_DIR" || exit 0

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

# Node 24 from the environment's setup script (docs/dev/DEVELOPMENT.md), for this
# script and, through CLAUDE_ENV_FILE, for every later command of the session.
if [ -d /opt/node24/bin ]; then
  export PATH="/opt/node24/bin:$PATH"
  [ -n "${CLAUDE_ENV_FILE:-}" ] && echo 'export PATH="/opt/node24/bin:$PATH"' >>"$CLAUDE_ENV_FILE"
fi

# Bun is known to fail behind the cloud proxy; fall back to npm (without
# touching the lockfile) so the make targets still work.
if [ ! -f node_modules/.install-stamp ] || [ package.json -nt node_modules/.install-stamp ] ||
  [ bun.lock -nt node_modules/.install-stamp ]; then
  if bun install --frozen-lockfile >/tmp/install.log 2>&1 ||
    npm install --no-save --no-package-lock --no-audit --no-fund >>/tmp/install.log 2>&1; then
    touch node_modules/.install-stamp
  else
    echo "WARNING: dependency install failed, see /tmp/install.log"
  fi
fi

node_major_minor=$(node -p 'process.versions.node.split(".").slice(0,2).join(".")')
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=19)?0:1)'; then
  echo "WARNING: node $node_major_minor is older than 22.19 (jsdom needs it). Check the environment setup script (docs/dev/DEVELOPMENT.md)."
fi

# Playwright browsers in the background: the download needs allowlisted hosts.
(bun x playwright install chromium >/tmp/playwright-install.log 2>&1 &)

if [ -f .claude/run/PLAN.md ]; then
  echo "Autonomous run active: follow CLAUDE.md \"Autonomous runs\" (cloud: git, stacked PRs)."
  echo
  cat .claude/run/PLAN.md
  echo
  cat .claude/run/PROGRESS.md 2>/dev/null
fi
exit 0
