// PostToolUse(Edit|Write): run prettier on the touched file, so formatting never
// costs a failed check later. Silent; unknown file types and files outside the
// project (e.g. Claude's memory) are skipped.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, sep } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const file = input.tool_input?.file_path
const project = resolve(process.env.CLAUDE_PROJECT_DIR ?? '.')
if (
  file &&
  resolve(file).startsWith(project + sep) &&
  /\.(ts|tsx|js|mjs|json|md|css|html|ya?ml)$/.test(file)
) {
  spawnSync(
    'bun',
    ['x', 'prettier', '--write', '--ignore-unknown', '--log-level', 'silent', file],
    {
      cwd: project,
      stdio: 'ignore',
    }
  )
}
