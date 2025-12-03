/**
 * Configure Claude Code hooks for automatic debugging memory integration
 */

import * as fs from 'fs';
import * as path from 'path';

export async function configureHooks(projectRoot: string): Promise<boolean> {
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  const claudeDir = path.dirname(settingsPath);

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Initialize hooks object if needed
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }

  const hooks = settings.hooks as Record<string, unknown[]>;

  // Hook: On session stop, auto-mine recent audit trail
  const stopHooks = (hooks.Stop || []) as Array<{ type?: string; command?: string }>;
  const hasMemoryHook = stopHooks.some((h) =>
    h.command?.includes('claude-code-debugger')
  );

  if (!hasMemoryHook) {
    stopHooks.push({
      type: 'command',
      command: 'npx @tyroneross/claude-code-debugger mine --days 1 --store 2>/dev/null || true'
    });
    hooks.Stop = stopHooks;
    settings.hooks = hooks;

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  }

  return false;
}
