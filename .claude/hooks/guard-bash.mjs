// PreToolUse(Bash): enforce the push rules of CLAUDE.md "Autonomous runs".
// Locally, during a run, Claude pushes nothing; in the cloud, never main, never `gh pr`.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const command = input.tool_input?.command ?? ''
const remote = process.env.CLAUDE_CODE_REMOTE === 'true'

function deny(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  )
  process.exit(0)
}

const pushes = /\b(git\s+push|jj\s+git\s+push)\b/.test(command)
const opensPr =
  /\bgh\s+pr\s+(create|edit|merge)\b/.test(command) ||
  /\bgh\s+api\b[^|;&]*\bpulls\b[^|;&]*(\s-[fF]\s|--(raw-)?field|-X\s*(POST|PATCH|PUT))/.test(
    command
  )

const runActive = existsSync(
  join(process.env.CLAUDE_PROJECT_DIR ?? '.', '.claude', 'run', 'PLAN.md')
)

if (!remote && runActive && (pushes || opensPr)) {
  deny(
    'Pushing and opening PRs is for cloud sessions only (CLAUDE.md "Autonomous runs"). Ask the user; they can run it with the ! prefix.'
  )
}

if (remote) {
  // Only the push itself, not the commands chained after it.
  const pushArgs = command.match(/\bgit\s+push\b[^|;&]*/g) ?? []
  if (pushArgs.some(p => /(\s|:|\+)(refs\/heads\/)?main(\s|$)/.test(p))) {
    deny('Never push to main. Push the step branch (see CLAUDE.md "Autonomous runs").')
  }
  if (/\bgh\s+pr\b/.test(command)) {
    deny(
      '`gh pr` uses GraphQL, which the cloud GitHub proxy blocks. Use the REST API: gh api repos/{owner}/{repo}/pulls ...'
    )
  }
  if (
    pushArgs.some(p => /\s(-d|--delete)\b|\s:[\w/-]+/.test(p)) ||
    /\bgh\s+api\b[^|;&]*(\/merge\b|(-X\s*|--method\s+)DELETE\b)/.test(command)
  ) {
    deny('Merging PRs and deleting branches is for the user.')
  }
}
