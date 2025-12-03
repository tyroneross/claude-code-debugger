/**
 * Inject debugging memory documentation into CLAUDE.md
 */

import * as fs from 'fs';
import * as path from 'path';

const MEMORY_SECTION = `

## Debugging Memory

This project uses @tyroneross/claude-code-debugger for debugging memory.

**Automatic behavior:**
- Past debugging sessions are stored and indexed
- Similar incidents surface automatically when investigating bugs
- Patterns are extracted from repeated issues

**Manual commands:**
- \`/memory-debug "symptom"\` - Search memory before debugging
- \`/memory-status\` - Show memory statistics
- \`/memory-mine\` - Mine recent audit trail

The system learns from your debugging sessions automatically.
`;

const MARKER = '## Debugging Memory';

export async function injectClaudeMd(projectRoot: string): Promise<boolean> {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

  let content = '';
  if (fs.existsSync(claudeMdPath)) {
    content = fs.readFileSync(claudeMdPath, 'utf-8');

    // Don't duplicate
    if (content.includes(MARKER)) {
      return false;
    }
  }

  content += MEMORY_SECTION;
  fs.writeFileSync(claudeMdPath, content);
  return true;
}
