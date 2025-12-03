/**
 * Create Claude Code slash commands for the debugging memory system
 */

import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DEBUG_CMD = `---
description: "Check debugging memory for similar issues before investigating"
allowedTools: ["Bash", "Read"]
---

! npx @tyroneross/claude-code-debugger debug "$ARGUMENTS"

Before investigating this issue, I checked the debugging memory for similar past incidents.
If a match was found with >70% confidence, I'll try that solution first.
`;

const MEMORY_STATUS_CMD = `---
description: "Show debugging memory statistics"
allowedTools: ["Bash"]
---

! npx @tyroneross/claude-code-debugger status

Here's the current state of the debugging memory system.
`;

const MEMORY_MINE_CMD = `---
description: "Mine audit trail for debugging incidents"
allowedTools: ["Bash"]
---

! npx @tyroneross/claude-code-debugger mine --days 7 --store

Mining the audit trail for recent debugging sessions to add to memory.
`;

export async function createSlashCommands(projectRoot: string): Promise<number> {
  const commandsDir = path.join(projectRoot, '.claude', 'commands');

  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  const commands = [
    { name: 'memory-debug.md', content: MEMORY_DEBUG_CMD },
    { name: 'memory-status.md', content: MEMORY_STATUS_CMD },
    { name: 'memory-mine.md', content: MEMORY_MINE_CMD },
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
