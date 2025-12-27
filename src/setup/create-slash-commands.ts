/**
 * Create Claude Code slash commands for the debugging memory system
 */

import * as fs from 'fs';
import * as path from 'path';

const DEBUGGER_CMD = `---
description: "Search past bugs for similar issues before debugging"
allowedTools: ["Bash", "Read"]
---

{{#if ARGUMENTS}}
! npx @tyroneross/claude-code-debugger debug "$ARGUMENTS"

Checked debugging memory for similar past incidents.
If a match was found with >70% confidence, I'll try that solution first.
{{else}}
! npx @tyroneross/claude-code-debugger status

No symptom provided. Showing recent issues from memory.
Please describe what you're debugging, or pick from a recent issue above.
{{/if}}
`;

const DEBUGGER_STATUS_CMD = `---
description: "Show debugging memory statistics"
allowedTools: ["Bash"]
---

! npx @tyroneross/claude-code-debugger status

Here's the current state of the debugging memory system.
`;

const DEBUGGER_SCAN_CMD = `---
description: "Scan recent sessions for debugging incidents"
allowedTools: ["Bash"]
---

! npx @tyroneross/claude-code-debugger mine --days 7 --store

Scanning recent Claude Code sessions for debugging work to add to memory.
`;

export async function createSlashCommands(projectRoot: string): Promise<number> {
  const commandsDir = path.join(projectRoot, '.claude', 'commands');

  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  const commands = [
    { name: 'debugger.md', content: DEBUGGER_CMD },
    { name: 'debugger-status.md', content: DEBUGGER_STATUS_CMD },
    { name: 'debugger-scan.md', content: DEBUGGER_SCAN_CMD },
  ];

  let created = 0;
  for (const cmd of commands) {
    const cmdPath = path.join(commandsDir, cmd.name);
    if (!fs.existsSync(cmdPath)) {
      fs.writeFileSync(cmdPath, cmd.content);
      created++;
    }
  }

  return created;
}
