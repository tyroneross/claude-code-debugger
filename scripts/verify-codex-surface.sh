#!/usr/bin/env bash
# verify-codex-surface.sh — minimal well-formedness check for the Codex plugin surface.
#
# Checks, all required to pass:
#   1. .codex-plugin/plugin.json is valid JSON.
#   2. Every path it declares (skills, mcpServers) exists relative to repo root
#      (Codex resolves these paths relative to the directory that CONTAINS
#      .codex-plugin/, not relative to plugin.json itself — verified 2026-08-29
#      by installing this plugin through a real `codex plugin add` and
#      inspecting the materialized cache).
#   3. Every directory under the declared skills path has a SKILL.md.
#   4. .mcp.json (if declared) is valid JSON and its server entry points at a
#      file that exists.
#   5. .agents/plugins/marketplace.json (if present) is valid JSON and its
#      plugin name matches .codex-plugin/plugin.json's name.
#   6. .codex-plugin/hooks/hooks.json (if present) is valid JSON.
#
# Exit 0 only when all checks pass. This does not attempt a real `codex
# plugin add` — that mutates the invoking user's global Codex plugin cache.
# For a live install check, see AGENTS.md `## Verifying on a real Codex host`.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$repo_root"

fail=0
note() { echo "verify-codex-surface: $*" >&2; }
error() { echo "verify-codex-surface: FAIL — $*" >&2; fail=1; }

manifest=".codex-plugin/plugin.json"
if [ ! -f "$manifest" ]; then
  error "$manifest not found"
  exit 1
fi

if ! python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$manifest" 2>/tmp/verify-codex-surface.err; then
  error "$manifest is not valid JSON: $(cat /tmp/verify-codex-surface.err)"
  exit 1
fi
note "$manifest is valid JSON"

skills_path=$(python3 -c "
import json
data = json.load(open('$manifest', encoding='utf-8'))
print(data.get('skills', ''))
")
mcp_path=$(python3 -c "
import json
data = json.load(open('$manifest', encoding='utf-8'))
print(data.get('mcpServers', ''))
")

if [ -z "$skills_path" ]; then
  error "$manifest declares no 'skills' path"
else
  skills_dir="${skills_path#./}"
  if [ ! -d "$skills_dir" ]; then
    error "declared skills path does not exist: $skills_dir (from $manifest 'skills')"
  else
    note "skills path resolves: $skills_dir"
    found_skill=0
    for d in "$skills_dir"/*/; do
      [ -d "$d" ] || continue
      found_skill=1
      if [ ! -f "${d}SKILL.md" ]; then
        error "skill directory missing SKILL.md: ${d}SKILL.md"
      else
        note "skill OK: ${d}SKILL.md"
      fi
    done
    if [ "$found_skill" -eq 0 ]; then
      error "no skill subdirectories found under $skills_dir"
    fi
  fi
fi

if [ -z "$mcp_path" ]; then
  note "$manifest declares no 'mcpServers' path (skipping MCP checks)"
else
  mcp_file="${mcp_path#./}"
  if [ ! -f "$mcp_file" ]; then
    error "declared mcpServers path does not exist: $mcp_file (from $manifest 'mcpServers')"
  elif ! python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$mcp_file" 2>/tmp/verify-codex-surface.err; then
    error "$mcp_file is not valid JSON: $(cat /tmp/verify-codex-surface.err)"
  else
    note "$mcp_file is valid JSON"
    # Resolve every ${CLAUDE_PLUGIN_ROOT}/... arg against repo root and check it exists.
    missing=$(python3 -c "
import json
data = json.load(open('$mcp_file', encoding='utf-8'))
servers = data.get('mcpServers', {})
missing = []
for name, cfg in servers.items():
    for arg in cfg.get('args', []):
        resolved = arg.replace('\${CLAUDE_PLUGIN_ROOT}', '.').replace('\$CLAUDE_PLUGIN_ROOT', '.')
        if resolved.startswith('./') or resolved.startswith('.'):
            import os
            if not os.path.isfile(resolved):
                missing.append(f'{name}: {arg} -> {resolved}')
print('\n'.join(missing))
")
    if [ -n "$missing" ]; then
      error "MCP server entrypoint(s) missing on disk:
$missing"
    else
      note "MCP server entrypoint(s) resolved on disk"
    fi
  fi
fi

marketplace=".agents/plugins/marketplace.json"
if [ -f "$marketplace" ]; then
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$marketplace" 2>/tmp/verify-codex-surface.err; then
    error "$marketplace is not valid JSON: $(cat /tmp/verify-codex-surface.err)"
  else
    mismatch=$(python3 -c "
import json
manifest = json.load(open('$manifest', encoding='utf-8'))
mkt = json.load(open('$marketplace', encoding='utf-8'))
plugin_name = manifest.get('name')
mkt_plugin_names = [p.get('name') for p in mkt.get('plugins', [])]
print('' if plugin_name in mkt_plugin_names else f'{plugin_name} not found in {mkt_plugin_names}')
")
    if [ -n "$mismatch" ]; then
      error "$marketplace plugin name mismatch: $mismatch"
    else
      note "$marketplace is valid JSON and names align with $manifest"
    fi
  fi
else
  note "$marketplace not present (optional — only needed for 'codex plugin marketplace add')"
fi

codex_hooks=".codex-plugin/hooks/hooks.json"
if [ -f "$codex_hooks" ]; then
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$codex_hooks" 2>/tmp/verify-codex-surface.err; then
    error "$codex_hooks is not valid JSON: $(cat /tmp/verify-codex-surface.err)"
  else
    note "$codex_hooks is valid JSON"
  fi
else
  note "$codex_hooks not present (optional)"
fi

rm -f /tmp/verify-codex-surface.err

if [ "$fail" != "0" ]; then
  note "FAILED"
  exit 1
fi

note "all checks passed ✅"
